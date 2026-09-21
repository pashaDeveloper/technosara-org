const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const sharp = require("sharp");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const storage = require("../utils/imageUpload");
const upload = require("../middleware/upload.middleware");

async function serve(t, app) {
  app.use(require("../middleware/error.middleware"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return "http://127.0.0.1:" + server.address().port;
}
function fakeStorage(t) {
  const files = new Map();
  const state = { fail: false, removeFailures: 0, puts: 0 };
  const clients = Object.fromEntries(["arvan", "cloudinary"].map(provider => [provider, {
    async put(key, buffer) {
      state.puts++;
      await new Promise(resolve => setTimeout(resolve, provider === "arvan" ? 5 : 1));
      files.set(provider + "/" + key, buffer);
      if (state.fail && provider === "cloudinary") throw new Error("Storage timeout after writing");
      return { key, url: "https://" + provider + ".example.com/" + key };
    },
    async remove(key) {
      if (state.removeFailures > 0) { state.removeFailures--; throw new Error("Temporary delete failure"); }
      files.delete(provider + "/" + key);
    },
  }]));
  t.mock.method(storage, "createClients", () => clients);
  return { files, state };
}
async function png() { return sharp({ create: { width: 400, height: 200, channels: 3, background: "#4488cc" } }).png().toBuffer(); }
function form(field, buffer, values = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  if (buffer) body.append(field, new Blob([buffer], { type: "image/png" }), "image.png");
  return body;
}

test("image upload providers, limits and rollback before error responses", async t => {
  const { files, state } = fakeStorage(t);
  const app = express();
  app.use(express.json({ limit: "8mb" }));
  for (const provider of ["arvan", "cloudinary", "both"]) {
    app.post("/" + provider + "/:outcome", upload("images", provider).fields([{ name: "cover", maxCount: 1 }, { name: "cardCover", maxCount: 1 }]), (req, res, next) => {
      if (req.params.outcome === "throw") return next(new Error("Database failed"));
      if (req.params.outcome === "reject") return res.status(422).json({ message: "Validation failed" });
      req.commitUploads();
      res.status(201).json(req.uploadedFiles);
    });
  }
  const base = await serve(t, app);
  const image = await png();
  for (const provider of ["arvan", "cloudinary", "both"]) {
    const before = files.size;
    const response = await fetch(base + "/" + provider + "/save", { method: "POST", body: form("cover", image) });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.deepEqual(Object.keys(result.cover[0].copies).sort(), provider === "both" ? ["arvan", "cloudinary"] : [provider]);
    assert.equal(files.size - before, provider === "both" ? 4 : 2);
    for (const [name, copies] of Object.entries(result.cover[0].copies)) {
      assert.equal((await sharp(files.get(name + "/" + copies.image.key)).metadata()).width, 400);
      const preview = await sharp(files.get(name + "/" + copies.preview.key)).metadata();
      assert.equal(preview.width, 64);
      assert.equal(preview.height, 64);
    }
  }
  const baseline = [...files.keys()].sort();
  for (const outcome of ["reject", "throw"]) {
    state.removeFailures = 2;
    const response = await fetch(base + "/both/" + outcome, { method: "POST", body: form("cover", image) });
    assert.equal(response.status, outcome === "reject" ? 422 : 500);
    assert.deepEqual([...files.keys()].sort(), baseline);
  }
  state.fail = true;
  assert.equal((await fetch(base + "/both/save", { method: "POST", body: form("cover", image) })).status, 502);
  assert.deepEqual([...files.keys()].sort(), baseline);
  state.fail = false;
  const two = form("cover", image);
  two.append("cardCover", new Blob([Buffer.from("invalid")]), "bad.png");
  assert.equal((await fetch(base + "/both/save", { method: "POST", body: two })).status, 400);
  assert.deepEqual([...files.keys()].sort(), baseline);
  const duplicate = form("cover", image);
  duplicate.append("cover", new Blob([image]), "second.png");
  for (const invalid of [duplicate, form("unknown", image), form("cover", Buffer.alloc(5 * 1024 * 1024 + 1))]) {
    const before = state.puts;
    assert.equal((await fetch(base + "/both/save", { method: "POST", body: invalid })).status, 400);
    assert.equal(state.puts, before);
  }
  const response = await fetch(base + "/arvan/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cover: "data:image/png;base64," + image.toString("base64") }) });
  assert.equal(response.status, 201);
});

test("six resource routes save images and roll back failed creates and updates", async t => {
  const { files, state } = fakeStorage(t);
  process.env.TOKEN_SECRET = "upload-test-secret";
  const database = "technosara_upload_test_" + process.pid + "_" + Date.now();
  await mongoose.connect("mongodb://127.0.0.1:27017", { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => { assert.equal(mongoose.connection.name, database); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const app = express();
  app.use(express.json({ limit: "8mb" }));
  for (const name of ["admin", "company", "genre", "person", "platform", "brand"]) app.use("/" + name, require("../routes/" + name + ".route"));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const base = await serve(t, app);
  const image = await png();
  const Admin = require("../models/admin.model");
  await Admin.create({ name: "Owner", email: "owner-upload@example.com", password: "password-123", role: "superAdmin" });
  const admin = await Admin.create({ name: "Editor", email: "editor-upload@example.com", password: "password-123", role: "admin" });
  const headers = { authorization: "Bearer " + jwt.sign({ _id: String(admin._id), role: "admin" }, process.env.TOKEN_SECRET) };
  const fixtures = [
    ["brand", "logo", { name: "Brand", slug: "image-brand", description: "Brand description", status: "active" }],
    ["company", "logo", { name: "Company", type: "developer", slug: "image-company", founders: [] }],
    ["genre", "image", { name: "Genre", slug: "image-genre" }],
    ["person", "photo", { name: "Person", positions: ["Director"] }],
    ["platform", "logo", { name: "Platform" }],
    ["admin", "avatar", { name: "New admin", email: "new-upload@example.com", password: "password-123" }],
  ];
  for (const [name, field, values] of fixtures) {
    const Model = require("../models/" + name + ".model");
    const createPath = "/" + name + (name === "admin" ? "/sign-up" : "");
    const created = await fetch(base + createPath, { method: "POST", headers, body: form(field, image, values) });
    assert.equal(created.status, 201, name + ": " + await created.text());
    const record = await Model.findOne({ name: values.name });
    assert.ok(record);
    assert.deepEqual(Object.keys(name === "admin" ? record.avatar.copies : record.image_storage).sort(), ["arvan", "cloudinary"]);
    const stored = name === "admin" ? record.avatar.copies : record.image_storage;
    assert.match(stored.arvan.image.key, new RegExp("^" + name + "/[^/]+/[A-Za-z0-9_-]{12}\\.webp$"));
    assert.equal(stored.arvan.preview.key, stored.arvan.image.key.replace(".webp", "-preview-64.webp"));
    const originalUrl = name === "admin" ? record.avatar.url : record[field];
    assert.match(originalUrl, /^https:\/\/arvan.example.com\//);
    const preview = name === "admin" ? record.avatar.blur.url : record.preview_url;
    assert.ok(preview);
    const before = files.size;
    const id = String(record._id);
    const updateHeaders = name === "admin" ? { authorization: "Bearer " + jwt.sign({ _id: id, role: "admin" }, process.env.TOKEN_SECRET) } : headers;
    const updatePath = "/" + name + (name === "admin" ? "/me" : "/" + id);
    const updated = await fetch(base + updatePath, { method: "PATCH", headers: updateHeaders, body: form(field, image) });
    assert.equal(updated.status, 200, name + ": " + await updated.text());
    assert.equal(files.size, before + 4);
    const current = await Model.findById(id);
    const currentUrl = name === "admin" ? current.avatar.url : current[field];
    assert.notEqual(currentUrl, originalUrl);
    const keys = [...files.keys()].sort();
    state.fail = true;
    const storageFailure = await fetch(base + updatePath, { method: "PATCH", headers: updateHeaders, body: form(field, image) });
    assert.equal(storageFailure.status, 502);
    assert.deepEqual([...files.keys()].sort(), keys);
    state.fail = false;
    const noImage = await fetch(base + updatePath, { method: "PATCH", headers: { ...updateHeaders, "content-type": "application/json" }, body: JSON.stringify({ name: values.name }) });
    assert.equal(noImage.status, 200);
    assert.deepEqual([...files.keys()].sort(), keys);
    const failed = await fetch(base + updatePath, { method: "PATCH", headers: updateHeaders, body: form(field, image, { name: "" }) });
    assert.ok(failed.status >= 400, name);
    assert.deepEqual([...files.keys()].sort(), keys);
    const unchanged = await Model.findById(id);
    assert.equal(name === "admin" ? unchanged.avatar.url : unchanged[field], currentUrl);
    const badCreate = await fetch(base + createPath, { method: "POST", headers, body: form(field, image, { ...values, name: "", email: "bad-" + name + "@example.com" }) });
    assert.ok(badCreate.status >= 400);
    assert.deepEqual([...files.keys()].sort(), keys);
    if (name !== "admin") {
      const missing = await fetch(base + "/" + name + "/" + new mongoose.Types.ObjectId(), { method: "PATCH", headers, body: form(field, image) });
      assert.equal(missing.status, 404);
      assert.deepEqual([...files.keys()].sort(), keys);
      const putCount = state.puts;
      assert.equal((await fetch(base + createPath, { method: "POST", body: form(field, image, values) })).status, 401);
      assert.equal(state.puts, putCount);
    }
  }
  const profile = await fetch(base + "/admin/account/me", { method: "PATCH", headers, body: form("avatar", image) });
  assert.equal(profile.status, 200, await profile.text());
  assert.match((await Admin.findById(admin._id)).avatar.url, /^https:\/\/arvan.example.com\//);
});

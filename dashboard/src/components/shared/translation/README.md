# Persian to English

The authenticated `/translation` page is linked in the dashboard sidebar.
It sends text to Microsoft Translator through `POST /api/translations`; no API key is required.
An active administrator session is required. Network access and the provider's
availability are required. The application limits each input to 500 UTF-8 bytes after
trimming (Persian characters generally use more than one byte).

```jsx
import PersianToEnglish from './PersianToEnglish';

<PersianToEnglish
  initialText="سلام"
  onTranslated={(english) => console.log(english)}
/>
```

`initialText` initializes the input on mount. `onTranslated` receives each
successful English translation. Translation is triggered only by submitting
the form. Editing the input clears the previous result.

The server calls the public Edge endpoint at
`https://edge.microsoft.com/translate/translatetext` using POST, `from=fa`,
`to=en` and a JSON array containing the text. This is not the supported Azure
subscription API; access may be limited or the endpoint may change. HTTP 429
is reported to the form without retrying or switching to another provider.
No `.env` key or additional dependency is needed.

Protocol reference: https://github.com/plainheart/bing-translate-api/blob/master/src/met/index.js

For an existing form, use `compact` with `sourceText`, `onTranslated` and
`onBusyChange`. This renders a translation button without a nested form.
Responses for a changed source are ignored.

The genre form now uses the named `AutoPersianToEnglish` export: it waits 700 ms
after source changes, cancels superseded requests, and fills the English name
and slug without a button. `initialSource` preserves saved values on edit until
the Persian name changes. `onBusyChange` covers both the delay and request.

All names are translated through Microsoft Translator without manual equivalents.
Translation quality, especially for isolated words, is not guaranteed;
the English name and slug remain editable.

import { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from '../../ckeditor/ckeditor';
import '../../components/shared/editor/Style.css';
import { asDescriptionHtml, descriptionFonts, descriptionFontSizes } from './gameDescription';

const config = {
  language: { ui: 'fa', content: 'fa' },
  toolbar: ['bold', 'italic', '|', 'fontFamily', 'fontSize', 'fontColor', '|', 'bulletedList', 'numberedList', '|', 'undo', 'redo'],
  fontFamily: { options: ['default', ...descriptionFonts] },
  fontSize: { options: ['default', ...descriptionFontSizes] },
};

export default function GameDescriptionEditor({ id, label, value, disabled, onChange, onBlur }) {
  const instance = useRef(null);
  const syncDisabled = editor => {
    if (!editor) return;
    if (disabled) editor.enableReadOnlyMode(id);
    else editor.disableReadOnlyMode(id);
  };
  useEffect(() => syncDisabled(instance.current), [disabled, id]);
  return <div id={id} className="min-w-0 [&_.ck-editor__editable]:min-h-28 [&_.ck-editor__editable]:!text-slate-900">
    <CKEditor editor={Editor} config={config} data={asDescriptionHtml(value)}
      onReady={editor => {
        instance.current = editor;
        syncDisabled(editor);
        editor.editing.view.change(writer => writer.setAttribute('aria-label', label, editor.editing.view.document.getRoot()));
      }}
      onAfterDestroy={editor => { if (instance.current === editor) instance.current = null; }}
      onChange={(_event, editor) => onChange(editor.getData())}
      onBlur={onBlur}
    />
  </div>;
}

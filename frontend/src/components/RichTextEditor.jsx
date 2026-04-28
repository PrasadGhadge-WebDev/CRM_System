import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

export default function RichTextEditor({ value, onChange, placeholder, height = '200px' }) {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  }

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'link'
  ]

  return (
    <div className="premium-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ height }}
      />
      <style>{`
        .premium-editor-wrapper {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .premium-editor-wrapper:focus-within {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.05);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
          padding: 8px 12px;
        }

        .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--text);
        }

        .ql-editor {
          min-height: 120px;
          padding: 12px 16px;
          color: var(--text);
        }

        .ql-editor.ql-blank::before {
          color: var(--text-dimmed);
          font-style: normal;
          opacity: 0.5;
          left: 16px;
        }

        /* Dark mode overrides for Quill icons */
        .ql-snow .ql-stroke {
          stroke: var(--text-muted);
        }
        .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill {
          fill: var(--text-muted);
        }
        .ql-snow .ql-picker {
          color: var(--text-muted);
        }
        
        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke {
          stroke: var(--primary);
        }

        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill {
          fill: var(--primary);
        }

        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active {
          color: var(--primary);
        }

        .ql-snow .ql-picker-options {
          background-color: #1e293b;
          border-color: var(--border);
        }
        
        .ql-snow .ql-tooltip {
          background-color: #1e293b;
          border: 1px solid var(--border);
          color: var(--text);
          box-shadow: var(--shadow-lg);
        }

        .ql-snow .ql-tooltip input[type=text] {
          background: #0f172a;
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { sanitizeNoteHtml } from '../../../core/domain/note-html';

export interface RichTextTool {
  command: string;
  icon: string;
  label: string;
  hint?: string;
}

const TOOLS: readonly RichTextTool[] = [
  { command: 'bold', icon: 'format_bold', label: 'Negrito', hint: 'Ctrl+B' },
  { command: 'italic', icon: 'format_italic', label: 'Itálico', hint: 'Ctrl+I' },
  { command: 'underline', icon: 'format_underlined', label: 'Sublinhado', hint: 'Ctrl+U' },
  { command: 'strikeThrough', icon: 'strikethrough_s', label: 'Riscado' },
  { command: 'insertUnorderedList', icon: 'format_list_bulleted', label: 'Lista' },
  { command: 'insertOrderedList', icon: 'format_list_numbered', label: 'Lista numerada' },
  { command: 'removeFormat', icon: 'format_clear', label: 'Limpar formatação' },
];

const STATEFUL = new Set(['bold', 'italic', 'underline', 'strikeThrough']);

@Component({
  selector: 'app-rich-text',
  templateUrl: './rich-text.component.html',
  styleUrl: './rich-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:selectionchange)': 'refresh()',
  },
})
export class RichTextComponent {
  readonly value = model('');
  readonly placeholder = input('Escreva aqui...');
  readonly label = input('Conteúdo da anotação');

  protected readonly tools = TOOLS;
  protected readonly active = signal<ReadonlySet<string>>(new Set());
  protected readonly empty = signal(true);

  private readonly editor = viewChild.required<ElementRef<HTMLElement>>('editor');

  constructor() {
    // Só escreve no DOM quando a mudança vem de fora, senão o cursor pularia a cada tecla.
    effect(() => {
      const value = this.value();
      const editor = this.editor().nativeElement;

      if (editor.innerHTML !== value) editor.innerHTML = value;
      this.empty.set(editor.textContent?.trim() === '');
    });
  }

  focus(): void {
    this.editor().nativeElement.focus();
  }

  protected onInput(): void {
    const editor = this.editor().nativeElement;
    this.value.set(editor.innerHTML);
    this.empty.set(editor.textContent?.trim() === '');
  }

  protected exec(command: string): void {
    this.editor().nativeElement.focus();
    run(command);
    this.onInput();
    this.refresh();
  }

  // Colar de um site traria fonte, cor e tag estranha: entra limpo ou como texto.
  protected onPaste(event: ClipboardEvent): void {
    const html = event.clipboardData?.getData('text/html');
    const text = event.clipboardData?.getData('text/plain') ?? '';
    event.preventDefault();

    if (html) run('insertHTML', sanitizeNoteHtml(html));
    else run('insertText', text);

    this.onInput();
  }

  protected refresh(): void {
    if (document.activeElement !== this.editor().nativeElement) return;

    const next = new Set<string>();
    for (const command of STATEFUL) {
      if (queryState(command)) next.add(command);
    }

    this.active.set(next);
  }

  protected isActive(command: string): boolean {
    return this.active().has(command);
  }
}

// `execCommand` é depreciado: sem ele a digitação continua, só o botão não aplica.
function run(command: string, value?: string): boolean {
  return typeof document.execCommand === 'function' && document.execCommand(command, false, value);
}

function queryState(command: string): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

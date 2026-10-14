import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextComponent } from './rich-text.component';

async function setup(value = ''): Promise<ComponentFixture<RichTextComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  const fixture = TestBed.createComponent(RichTextComponent);
  fixture.componentRef.setInput('value', value);
  await fixture.whenStable();

  return fixture;
}

const editorOf = (fixture: ComponentFixture<RichTextComponent>) =>
  fixture.nativeElement.querySelector('.editor') as HTMLElement;

describe('RichTextComponent', () => {
  it('desenha a barra de formatação com os comandos', async () => {
    const fixture = await setup();
    const buttons = fixture.nativeElement.querySelectorAll('.toolbar__button');

    expect(buttons).toHaveLength(7);
    expect(buttons[0].getAttribute('aria-label')).toBe('Negrito');
  });

  it('mostra o conteúdo que recebe', async () => {
    const fixture = await setup('<b>oi</b>');

    expect(editorOf(fixture).innerHTML).toBe('<b>oi</b>');
  });

  it('atualiza o DOM quando o valor muda de fora', async () => {
    const fixture = await setup('<b>antes</b>');

    fixture.componentRef.setInput('value', '<i>depois</i>');
    await fixture.whenStable();

    expect(editorOf(fixture).innerHTML).toBe('<i>depois</i>');
  });

  it('o que o usuário digita vira o valor', async () => {
    const fixture = await setup();
    const editor = editorOf(fixture);

    editor.innerHTML = '<b>digitado</b>';
    editor.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('<b>digitado</b>');
  });

  it('marca vazio para o placeholder aparecer', async () => {
    const fixture = await setup();
    expect(editorOf(fixture).classList.contains('editor--empty')).toBe(true);

    fixture.componentRef.setInput('value', '<div>texto</div>');
    await fixture.whenStable();

    expect(editorOf(fixture).classList.contains('editor--empty')).toBe(false);
  });

  it('marcação sem texto continua contando como vazio', async () => {
    const fixture = await setup('<div><br></div>');

    expect(editorOf(fixture).classList.contains('editor--empty')).toBe(true);
  });

  it('é anunciado como campo de texto de várias linhas', async () => {
    const fixture = await setup();
    const editor = editorOf(fixture);

    expect(editor.getAttribute('role')).toBe('textbox');
    expect(editor.getAttribute('aria-multiline')).toBe('true');
    expect(editor.getAttribute('contenteditable')).toBe('true');
  });

  it('colar não deixa o conteúdo de fora passar cru', async () => {
    const fixture = await setup();
    const editor = editorOf(fixture);

    const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/html' ? '<b style="color:red">x</b>' : 'x'),
      },
    });

    editor.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(editor.innerHTML).not.toContain('style');
  });
});

import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { NOTE_COLORS } from '../../../../core/constants/note-colors';
import { NoteColor } from '../../../../core/domain/models';

@Component({
  selector: 'app-note-color-picker',
  templateUrl: './note-color-picker.component.html',
  styleUrl: './note-color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteColorPickerComponent {
  readonly value = model<NoteColor>('none');

  protected readonly colors = NOTE_COLORS;
}

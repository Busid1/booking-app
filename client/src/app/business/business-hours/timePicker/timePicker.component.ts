import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-timePicker',
  templateUrl: './timePicker.component.html',
  standalone: true,
})
export class TimePickerComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() invalid = false;

  @Output() timeChanged = new EventEmitter<string>();

  onTimeChange(event: Event) {
    this.timeChanged.emit((event.target as HTMLInputElement).value);
  }
}

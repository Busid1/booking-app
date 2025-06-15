import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-timePicker',
  templateUrl: './timePicker.component.html',
  standalone: true,
})
export class TimePickerComponent {
  @Input() label: string = '';
  @Input() value: string = '';

  @Output() timeChanged = new EventEmitter<string>();

  onTimeChange(event: Event) {
    const newValue = (event.target as HTMLInputElement).value;
    this.timeChanged.emit(newValue);
  }
}

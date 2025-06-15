import { Component, OnInit } from '@angular/core';
import { BusinessHoursInterface } from '../../../shared/interfaces/business-hours.interface';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../../admin/crud/services.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimePickerComponent } from './timePicker/timePicker.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-business-hours',
  templateUrl: './business-hours.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, TimePickerComponent]
})

export class BusinessHoursComponent implements OnInit {
  constructor(private businessHoursService: ServicesService) { }
  formData: {
    [key: number]: {
      isClosed: boolean;
      timeBlocks: {
        openTime: string;
        closeTime: string;
      }[];
    };
  } = {
      0: { isClosed: false, timeBlocks: [] },
      1: { isClosed: false, timeBlocks: [] },
      2: { isClosed: false, timeBlocks: [] },
      3: { isClosed: false, timeBlocks: [] },
      4: { isClosed: false, timeBlocks: [] },
      5: { isClosed: false, timeBlocks: [] },
      6: { isClosed: false, timeBlocks: [] },
    };

  dayOfWeek: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  handleTimeChange(dayIndex: number, blockIndex: number, field: 'openTime' | 'closeTime', value: string) {
    this.formData[dayIndex].timeBlocks[blockIndex][field] = value;
  }

  prepareFormDataForSubmission(): BusinessHoursInterface[] {
    return Object.entries(this.formData).map(([day, data]) => ({
      dayOfWeek: parseInt(day),
      isClosed: data.isClosed,
      timeBlocks: data.timeBlocks,
    }));
  }

  handleSaveBusinessHours(event: Event) {
    event.preventDefault()
    const payload = this.prepareFormDataForSubmission();

    this.businessHoursService.saveBusinessHours(payload).subscribe({
      next: () => {
        Swal.fire({
          title: "Horario guardado correctamente",
          confirmButtonText: "Ok",
          confirmButtonColor: "#22c55e",
        })
        console.log('Horarios guardados correctamente')
      },
      error: (err) => console.error('Error al guardar horarios:', err)
    });
  }

  async ngOnInit() {
    const response = await firstValueFrom(this.businessHoursService.getBusinessHours());

    const defaultFormData: {
      [key: number]: {
        isClosed: boolean;
        timeBlocks: {
          openTime: string;
          closeTime: string;
        }[];
      };
    } = {
      0: { isClosed: false, timeBlocks: [] },
      1: { isClosed: false, timeBlocks: [] },
      2: { isClosed: false, timeBlocks: [] },
      3: { isClosed: false, timeBlocks: [] },
      4: { isClosed: false, timeBlocks: [] },
      5: { isClosed: false, timeBlocks: [] },
      6: { isClosed: false, timeBlocks: [] },
    };

    for (const entry of response) {
      defaultFormData[entry.dayOfWeek] = {
        isClosed: entry.isClosed,
        timeBlocks: entry.timeBlocks,
      };
    }

    this.formData = defaultFormData;    
  }

  handleAddNewTime(index: number) {
    this.formData[index].timeBlocks.push({ openTime: '', closeTime: '' });
  }

  handleRemoveNewTime(dayIndex: number, blockIndex: number) {
    this.formData[dayIndex].timeBlocks.splice(blockIndex, 1);
  }
}

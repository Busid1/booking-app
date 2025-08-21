import { Component, OnInit } from '@angular/core';
import { BusinessHoursInterface } from '../../shared/interfaces/business-hours.interface';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimePickerComponent } from './timePicker/timePicker.component';
import Swal from 'sweetalert2';
import { SharedService } from '../../shared/services/shared.service';

@Component({
  selector: 'app-business-hours',
  templateUrl: './business-hours.component.html',
  imports: [CommonModule, FormsModule, TimePickerComponent],
  standalone: true,
})

export class BusinessHoursComponent implements OnInit {
  constructor(private businessHoursService: ServicesService, private sharedService: SharedService) { }

  editBusinessHours: boolean = false;
  handleEditBusinessHours() {
    this.editBusinessHours = !this.editBusinessHours
  }

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
      isClosed: data.timeBlocks.length === 0 ? true : data.isClosed,
      timeBlocks: data.timeBlocks,
    }));
  }

  async handleSaveBusinessHours(event: Event) {
    event.preventDefault()
    const payload = this.prepareFormDataForSubmission(); 
    
    const hasEmptyBlock = Object.values(payload).some((day: any) =>
      day.timeBlocks.some((block: any) => !block.openTime || !block.closeTime)
    );

    if (hasEmptyBlock) {
      await Swal.fire({
        title: "Bloques de horas incompletos",
        text: "Por favor, completa todas las horas antes de guardar.",
        icon: "warning",
        confirmButtonText: "Ok",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    this.businessHoursService.saveBusinessHours(payload).subscribe({
      next: async () => {
        Swal.fire({
          title: "Horario guardado correctamente",
          confirmButtonText: "Ok",
          confirmButtonColor: "#22c55e",
        })

        this.editBusinessHours = false;

        await this.sharedService.loadAllBusinessHours()
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

    for (const { dayOfWeek, isClosed, timeBlocks } of response) {
      defaultFormData[dayOfWeek] = {
        isClosed: timeBlocks.length === 0 ? true : isClosed,
        timeBlocks: timeBlocks.length === 0 ? [] : timeBlocks
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

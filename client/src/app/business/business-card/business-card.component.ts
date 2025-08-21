import { Component } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { AdminButtonsComponent } from '../../dashboard/admin/admin-buttons/admin-buttons.component';
import { CommonModule } from '@angular/common';
import { CarouselComponent } from './carousel.component';
import { BusinessHoursComponent } from '../business-hours/business-hours.component';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { BusinessHoursInterface } from '../../shared/interfaces/business-hours.interface';
import { SharedService } from '../../shared/services/shared.service';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [CommonModule, CarouselComponent, BusinessHoursComponent],
  templateUrl: './business-card.component.html',
  styleUrls: [],
})
export default class BusinessCardComponent {
  constructor(private authService: AuthService, private businessHoursService: ServicesService, private sharedService: SharedService) { }

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

  businessInfo: any = {
    name: 'Mi Negocio Ejemplo',
    description: 'Somos expertos en servicios de calidad, comprometidos con la satisfacción del cliente.',
    address: 'Calle Falsa 123, Ciudad',
    phone: '+34 600 123 456',
    email: 'info@minegocio.com',
    hours: [] as BusinessHoursInterface[]
  };

  ngOnInit() {
    this.sharedService.allBusinessHours$.subscribe((hours) => {
      this.businessInfo.hours = hours;
    });

    this.sharedService.loadAllBusinessHours();
  }

  getCurrentDay(): number {
    return new Date().getDay();
  }

  getDayName(day: number): string {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[day];
  }

  formatTimeBlocks(timeBlocks: { openTime: string; closeTime: string }[]): string {
    return timeBlocks.length > 0
      ? timeBlocks.map(block => `${block.openTime} - ${block.closeTime}`).join(', ')
      : '';
  }

  isAdmin() {
    return this.authService.isAdmin();
  }
  isOpenNow(): boolean {
    const now = new Date();
    const todayIndex = now.getDay();
    const todayHours = this.businessInfo.hours.find((h: any) => h.dayOfWeek === todayIndex);

    if (!todayHours || todayHours.isClosed) return false;


    for (const block of todayHours.timeBlocks) {
      const [openHour, openMinute] = block.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = block.closeTime.split(':').map(Number);

      const openDate = new Date(now);
      openDate.setHours(openHour, openMinute, 0, 0);

      const closeDate = new Date(now);
      closeDate.setHours(closeHour, closeMinute, 0, 0);

      if (now >= openDate && now <= closeDate) {
        return true;
      }
    }

    return false;
  }

}

import { Component } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { CommonModule } from '@angular/common';
import { CarouselComponent } from './carousel/carousel.component';
import { BusinessHoursComponent } from '../business-hours/business-hours.component';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { BusinessHoursInterface } from '../../shared/interfaces/business-hours.interface';
import { SharedService } from '../../shared/services/shared.service';
import { BusinessInfoInterface } from '../../shared/interfaces/business-info.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [CommonModule, CarouselComponent, BusinessHoursComponent],
  templateUrl: './business-card.component.html',
  styleUrls: [],
})
export default class BusinessCardComponent {
  constructor(private authService: AuthService, private businessHoursService: ServicesService, private sharedService: SharedService) { }

  isEditInfo: boolean = false;
  isLoadingCardInfo: boolean = false;
  businessInfoFormData: BusinessInfoInterface = {
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    images: []
  }

  handleEditInfo() {
    this.isEditInfo = !this.isEditInfo;
  }

  handleInputChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.businessInfoFormData[field as "name" | "description" | "address" | "phone" | "email"] = value;
  }

  async handleSaveBusinessInfo() {
    const formData = new FormData();

    formData.append('name', this.businessInfoFormData.name);
    formData.append('description', this.businessInfoFormData.description);
    formData.append('address', this.businessInfoFormData.address);
    formData.append('phone', this.businessInfoFormData.phone);
    formData.append('email', this.businessInfoFormData.email);
    try {
      await firstValueFrom(this.businessHoursService.saveBusinessInfo(formData))
      Swal.fire("Cambios realizados correctamente", "", "success")
      this.isEditInfo = false
    }
    catch (error) {
      console.log(error)
    }
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

  businessInfo: any = {
    name: 'Mi Negocio Ejemplo',
    description: 'Somos expertos en servicios de calidad, comprometidos con la satisfacción del cliente.',
    hours: [] as BusinessHoursInterface[]
  };

  async ngOnInit() {
    this.isLoadingCardInfo = true;
    this.sharedService.allBusinessHours$.subscribe((hours) => {
      this.businessInfo.hours = hours;
    });

    this.sharedService.loadAllBusinessHours();
    try {
      const response = await firstValueFrom(this.businessHoursService.getBusinessInfo());
      this.businessInfoFormData = response[0];
    } catch (error) {
      console.log(error);
    } finally {
      this.isLoadingCardInfo = false;
    }
  }

  getCurrentDay(): number {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
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

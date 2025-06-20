// shared.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SharedService {
  private selectedServiceSubject = new BehaviorSubject<any>(null);
  selectedService$ = this.selectedServiceSubject.asObservable();

  setSelectedService(serviceId: string) {
    this.selectedServiceSubject.next(serviceId);
  }
}
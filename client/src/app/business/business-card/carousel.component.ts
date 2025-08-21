import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-carousel',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div class="relative w-full overflow-hidden rounded-b-none rounded-t-xl">
      <div class="flex transition-transform duration-500"
           [style.transform]="'translateX(-' + currentIndex * 100 + '%)'">
        <div *ngFor="let slide of slides" class="flex-shrink-0 w-full h-64 md:h-96">
          <img [src]="slide" alt="Slide"
               class="w-full h-full object-cover rounded-b-none rounded-t-xl" />
        </div>
      </div>

      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <button *ngFor="let slide of slides; let i = index"
                class="w-3 h-3 rounded-full"
                [ngClass]="{'bg-white': i === currentIndex, 'bg-gray-400': i !== currentIndex}"
                (click)="goToSlide(i)"></button>
      </div>

      <button (click)="prev()" class="absolute top-1/2 left-2 flex items-center justify-center -translate-y-1/2 bg-white/75 size-10 rounded-full"><i class="fas fa-chevron-left text-md"></i></button>
      <button (click)="next()" class="absolute top-1/2 right-2 flex items-center justify-center -translate-y-1/2 bg-white/75 size-10 rounded-full"><i class="fas fa-chevron-right text-md"></i></button>
    </div>
  `,
})
export class CarouselComponent implements OnInit {
  slides = [
    'https://joseppons.com/formacion/wp-content/uploads/2020/11/servicios-salon-barberia.jpeg',
    'https://peluqueriacruz.com/wp-content/uploads/2024/02/joven-peluqueria-corte-pelo-1024x683.jpg',
    'https://salvapeluquerostyle.com/wp-content/uploads/barberia-peluqueria-masculina.jpg'
  ];
  currentIndex = 0;
  interval: any;

  ngOnInit() {
    this.interval = setInterval(() => this.next(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(i: number) {
    this.currentIndex = i;
  }
}

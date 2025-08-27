import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../../dashboard/admin/crud/services.service';
import { BusinessInfoInterface } from '../../../shared/interfaces/business-info.interface';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  imports: [CommonModule],
  standalone: true
})
export class CarouselComponent implements OnInit {

  placeholderUrl = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg';

  slides: string[] = [];
  previews: string[] = ['', '', ''];
  selectedFiles: (File | null)[] = [null, null, null];

  businessInfoFormData: BusinessInfoInterface = {
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    images: []
  };

  currentIndex = 0;
  interval: any;
  isModalOpen = false;

  constructor(private businessHoursService: ServicesService, private authService: AuthService) { }

  async ngOnInit() {
    this.interval = setInterval(() => this.next(), 5000);

    const response = await firstValueFrom(this.businessHoursService.getBusinessInfo());
    this.slides = response.flatMap(item => (item.images as string[]) || []);

    while (this.slides.length < 3) this.slides.push("");
  }

  ngOnDestroy() { clearInterval(this.interval); }
  next() { this.currentIndex = (this.currentIndex + 1) % this.slides.length; clearInterval(this.interval); }
  prev() { this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length; clearInterval(this.interval); }
  goToSlide(i: number) { this.currentIndex = i; }

  async openModal() {
    this.isModalOpen = true;
    this.previews = ['', '', ''];
    this.selectedFiles = [null, null, null];
    const response = await firstValueFrom(this.businessHoursService.getBusinessInfo());
    this.slides = response.flatMap(item => (item.images as string[]) || []);
    while (this.slides.length < 3) this.slides.push("");
  }

  closeModal() { this.isModalOpen = false; }

  onFileChange(event: any, index: number) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFiles[index] = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.previews[index] = e.target.result;
    reader.readAsDataURL(file);
  }

  isAdmin() {
    return this.authService.isAdmin();
  }

  async removeImage(index: number) {
    const imageToDelete = this.slides[index];
    this.previews[index] = '';

    if (!imageToDelete) return;

    const result = await Swal.fire({
      title: '¿Seguro que quieres eliminar esta imagen?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      this.businessHoursService.deleteBusinessImage(imageToDelete).subscribe({
        next: () => {
          this.slides[index] = '';
          this.previews[index] = '';
          this.selectedFiles[index] = null;
          Swal.fire('Imagen eliminada', '', 'success');
          this.closeModal();
        },
        error: () => Swal.fire('Error al eliminar la imagen', '', 'error')
      });
    }
  }

  handleUploadImages() {
    const files = this.selectedFiles.filter(f => f !== null) as File[];

    this.businessHoursService.uploadImages(files).subscribe({
      next: () => {
        Swal.fire('Imágenes subidas correctamente', '', 'success');

        this.selectedFiles.forEach((file, i) => {
          if (file && this.previews[i]) {
            this.slides[i] = this.previews[i];
          }
        });

        this.slides = [...this.slides];

        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error al subir imágenes', '', 'error');
      }
    });
  }

  getImageUrl(index: number) {
    return this.slides[index] || this.placeholderUrl;
  }
}

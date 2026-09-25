import { ServiceInterface } from '../../../shared/interfaces/service.interface';

/** Construye el FormData multipart que espera la API de servicios. */
export function buildServiceFormData(service: ServiceInterface): FormData {
  const formData = new FormData();
  formData.append('title', service.title.trim());
  formData.append('price', String(service.price));
  formData.append('duration', String(service.duration));
  formData.append('description', service.description?.trim() ?? '');
  if (service.image instanceof File) formData.append('image', service.image);
  return formData;
}

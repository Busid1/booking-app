import { Component } from '@angular/core';
import { ProductService } from '../../../products/data-access/products.service';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [],
  templateUrl: './create-product.component.html',
})

export default class CreateProductComponent {
  constructor(private productsService: ProductService) { }

  formData = {
    title: '',
    price: 0,
    category: '',
    image: null as File | string | null,
    description: '',
  }

  handleOnChange(field: string, event: Event) {
    let value = (event.target as HTMLInputElement).value;
    if (field === "price" && value.length > 4) {
      value = value.slice(0, 3);
      (event.target as HTMLInputElement).value = value;
    }
    this.formData[field as 'title' | 'category' | 'description'] = value
  }

  handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.formData.image = file;
    }
  }

  async submitForm(event: Event) {
    event.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('title', this.formData.title);
    formDataToSend.append('price', this.formData.price.toString());
    formDataToSend.append('description', this.formData.description);
    formDataToSend.append('category', this.formData.category);
    if (this.formData.image) {
      formDataToSend.append('image', this.formData.image);
    }

    Swal.fire({
      title: "Are you sure you want to create this product?",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      denyButtonText: "No",
      cancelButtonText: "Cancel"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await firstValueFrom(
            this.productsService.createProduct(formDataToSend)
          );
          Swal.fire("Product created", "", "success");
          console.log("Product created:", response);
        } catch (error) {
          console.error("Error creating the product:", error);
        }
      } else if (result.isDenied) {
        Swal.fire("Product not created", "", "info");
      }
    });
  }

}

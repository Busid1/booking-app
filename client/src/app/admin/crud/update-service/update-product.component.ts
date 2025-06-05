import { Component, effect, inject } from '@angular/core';
import { ProductCardComponent } from '../../../product/ui/product-card/product-card.component';
import ProductDetailStateService from '../../../products/data-access/product-detail-state.service';
import Swal from 'sweetalert2';
import { ProductService } from '../../../products/data-access/products.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-update-product',
  standalone: true,
  imports: [],
  templateUrl: './update-product.component.html',
  styleUrl: './update-product.component.scss',
  providers: [ProductDetailStateService]
})

export default class UpdateProductComponent {
  productState = inject(ProductCardComponent);
  productDetailState = inject(ProductDetailStateService).state;
  constructor(private productsService: ProductService) { }

  closeUpdateModal() {
    this.productState.showUpdateModal = false
    document.body.classList.remove("overflow-hidden");
  }

  super() {
    effect(() => {
      const _id = this.productState._id
      if (_id) {
        this.productDetailState.getById(_id);
      }
    })
  }

  formData = {
    title: this.productState.product().title,
    price: this.productState.product().price,
    category: this.productState.product().category,
    image: this.productState.product().image as string | File,
    description: this.productState.product().description,
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
      this.formData.image = file
    }
  }

  deleteProduct() {
    Swal.fire({
      title: "Are you sure you want to delete this product?",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      denyButtonText: "No",
      cancelButtonText: "Cancel"
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire("Removed product", "", "success");
        await firstValueFrom(this.productsService.deleteProduct(this.productState._id));
        window.location.reload()
      } else if (result.isDenied) {
        Swal.fire("Product not removed", "", "info");
      }
    });
  }

  async submitUpdateForm(event: Event) {
    event.preventDefault()

    const formDataToSend = new FormData();
    formDataToSend.append('title', this.formData.title);
    formDataToSend.append('price', this.formData.price.toString());
    formDataToSend.append('description', this.formData.description);
    formDataToSend.append('category', this.formData.category);
    if (this.formData.image) {
      formDataToSend.append('image', this.formData.image);
    }

    Swal.fire({
      title: "Are you sure you want to update this product?",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Si",
      denyButtonText: "No",
      cancelButtonText: "Cancelar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await firstValueFrom(
            this.productsService.updateProduct(this.productState._id, formDataToSend)
          );
          Swal.fire("Updated product", "", "success");
          setTimeout(() => {
            window.location.reload()
          }, 3000)
          console.log("Updated product:", response);
        } catch (error) {
          console.error("Error updating the product:", error);
        }
      } else if (result.isDenied) {
        Swal.fire("Product not updated", "", "info");
      }
    });
  }
}
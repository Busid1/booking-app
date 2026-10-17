import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedService } from '../shared/services/shared.service';
import { activeSocials } from '../shared/services/social-links';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  standalone: true,
  imports: [RouterLink],
})
export class FooterComponent {
  readonly store = inject(SharedService);
  readonly year = new Date().getFullYear();
  readonly socials = computed(() => activeSocials(this.store.businessInfo()));
}

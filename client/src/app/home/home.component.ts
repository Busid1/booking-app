import { Component, computed, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BusinessComponent } from '../business/business.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { formatDuration } from '../shared/services/time.utils';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BusinessComponent, RouterLink, CurrencyPipe],
  templateUrl: './home.component.html',
})
export default class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);
  readonly featured = computed(() => this.store.services().slice(0, 3));
  readonly formatDuration = formatDuration;

  ngOnInit() {
    this.store.loadAllServices().catch(() => undefined);
  }
}

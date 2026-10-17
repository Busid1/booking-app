import { Component, computed, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BusinessComponent } from '../business/business.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { formatDuration } from '../shared/services/time.utils';
import { StaffAvatarComponent } from '../shared/services/staff-avatar.component';
import { StarRatingComponent } from '../shared/services/star-rating.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BusinessComponent, RouterLink, CurrencyPipe, DatePipe, StaffAvatarComponent, StarRatingComponent],
  templateUrl: './home.component.html',
})
export default class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);
  readonly featured = computed(() => this.store.services().slice(0, 3));
  readonly formatDuration = formatDuration;
  readonly latestReviews = computed(() => this.store.reviews().reviews.filter(r => r.comment).slice(0, 6));

  ngOnInit() {
    this.store.loadAllServices().catch(() => undefined);
    this.store.loadStaff().catch(() => undefined);
    this.store.loadReviews().catch(() => undefined);
  }
}

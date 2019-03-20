import { animate, style, transition, trigger } from '@angular/animations';

export const fade = trigger('fadeItems', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('.5s cubic-bezier(.8, -0.6, 0.2, 1.5)',
      style({ opacity: 1 }))
  ])
]);


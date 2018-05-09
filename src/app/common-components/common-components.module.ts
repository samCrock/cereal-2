import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule, Routes } from '@angular/router';
import { EpisodeComponent, NavbarComponent } from './index';

// Pipes
import { SortPipe, TrimPipe } from '../pipes/index';

const COMMON_COMPONENTS = [
  EpisodeComponent,
  NavbarComponent
];

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    RouterModule
  ],
  declarations: [
    ...COMMON_COMPONENTS,
    SortPipe,
    TrimPipe
  ],
  exports: [
    ...COMMON_COMPONENTS,
    SortPipe,
    TrimPipe
  ]
})
export class CommonComponentsModule { }

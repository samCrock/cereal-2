import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule, Routes } from '@angular/router';
import { EpisodeComponent, NavbarComponent, ShowPreviewComponent, ExpandedCardComponent, DialogComponent } from '.';
import { MatDialogModule } from '@angular/material';
// Pipes
import { SortPipe, TrimPipe } from '../pipes';

const COMMON_COMPONENTS = [
  EpisodeComponent,
  NavbarComponent,
  ShowPreviewComponent,
  ExpandedCardComponent,
  DialogComponent
];

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    RouterModule,
    MatDialogModule
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
  ],
  // entryComponents: [DialogComponent]
})
export class CommonComponentsModule { }

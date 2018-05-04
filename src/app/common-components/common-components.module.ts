import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule, Routes } from '@angular/router';
import {
	EpisodeComponent
} from './index';


const COMMON_COMPONENTS = [
EpisodeComponent
];

@NgModule({
	imports: [
	CommonModule,
	FlexLayoutModule,
	RouterModule
	],
	declarations: [
	...COMMON_COMPONENTS
	],
	exports: [
	...COMMON_COMPONENTS
	]
})
export class CommonComponentsModule { }

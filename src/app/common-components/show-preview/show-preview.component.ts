import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';


@Component({
	selector: 'app-show-preview',
	templateUrl: './show-preview.component.html',
	styleUrls: ['./show-preview.component.scss']
})
export class ShowPreviewComponent implements OnInit {


	@Input() show: Object;

	private openedTrailer = false;
	private sanitizedTrailer;

	constructor(private sanitizer: DomSanitizer) { }

	ngOnInit() {
		console.log('ShowPreviewComponent', this.show);
	}

	play_trailer() {
		this.openedTrailer = true;
	}

	getTrailer() {
		if (!this.sanitizedTrailer) {
			this.sanitizedTrailer = this.sanitizer.bypassSecurityTrustResourceUrl(this.show['trailer'].replace('watch?v=', 'embed/'));
		}
		return this.sanitizedTrailer;
	}

	closeTrailer() {
		this.openedTrailer = false;
	}

}

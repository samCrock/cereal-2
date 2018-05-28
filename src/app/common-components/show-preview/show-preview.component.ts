import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ScrapingService } from '../../services/scraping.service';
import { style } from '@angular/animations';


@Component({
  selector: 'app-show-preview',
  templateUrl: './show-preview.component.html',
  styleUrls: ['./show-preview.component.scss']
})
export class ShowPreviewComponent implements OnChanges {


  @Input() show: Object;

  private openedTrailer = false;
  private sanitizedTrailer;
  private wallpaper;
  constructor(private sanitizer: DomSanitizer, private scrapingService: ScrapingService) {}

  ngOnChanges() {
    if (this.show) {
      this.scrapingService.retrieveRemoteWallpaper(this.show['dashed_title'])
      .subscribe(path => {
        this.wallpaper = path;
        const bgContainer = document.getElementsByClassName('bg-container')[0];
        bgContainer['style'].background = 'linear-gradient(to bottom, rgba(58, 70, 76, .4), rgb(58, 70, 76) 90%),' +
        'url(' + path + ') no-repeat center';
      });
    }
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

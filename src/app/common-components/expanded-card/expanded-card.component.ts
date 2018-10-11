import { Component, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expanded-card',
  templateUrl: './expanded-card.component.html',
  styleUrls: ['./expanded-card.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService]
})
export class ExpandedCardComponent implements OnChanges {

  @Input() show: Object;

  public path = this.electronService.remote.getGlobal('path');
  public shell = this.electronService.remote.getGlobal('shell');
  public expanded = false;
  public hovering_episode = {};
  public isPosterAsync = false;

  constructor(
    public dbService: DbService,
    public scrapingService: ScrapingService,
    public subsService: SubsService,
    public torrentService: TorrentService,
    public electronService: ElectronService,
    public router: Router
    ) { }

  ngOnChanges() {
    if (this.show['poster'] instanceof Observable) {
      this.isPosterAsync = true;
    }
  }

  enterCard(event, show) {
    // console.log('< enter', event);
    const card = event.srcElement;
    this.hovering_episode = show;

    // console.log(show);
    // document.getElementById('expanded_card').style.display = 'none';
    document.querySelectorAll('[id=expanded_card]')['forEach'](element => {
      element.style.display = 'none';
    });
    const exp_card = event.srcElement.nextElementSibling,
    target_coordinates = event.target.getBoundingClientRect(),
    target = event.target,
    before_transitions = `
    background-image 0s,
    box-shadow 0s,
    height 0s,
    width 0s,
    left 0s,
    top 0s,
    font-size 0s,
    background-size 0s,
    ease-in-out`,
    after_transitions = `
    background-image 0s,
    box-shadow .6s,
    height .6s,
    width .6s,
    left .6s,
    top .6s,
    font-size .6s,
    background-size 0s ease-in-out`;

    exp_card.style.transition = before_transitions;
    exp_card.style.display = 'block';

    // START
    const card_style = window.getComputedStyle(card);
    const computed_card_h = card_style.height.split('px')[0];
    const computed_card_w = card_style.width.split('px')[0];

    exp_card.style.top = 'calc(' + target.offsetTop + 'px - 2px)';
    exp_card.style.left = 'calc(' + target_coordinates.left + 'px - 2px)';

    exp_card.style.width = 'calc(' + computed_card_w + 'px + 2px)';
    exp_card.style.height = 'calc(' + computed_card_h + 'px + 2px)';

    exp_card.style.backgroundImage = target.style.backgroundImage;
    exp_card.getElementsByClassName('card-title')[0]['style']['transition'] = before_transitions;
    exp_card.getElementsByClassName('card-episode')[0]['style']['transition'] = before_transitions;
    exp_card.getElementsByClassName('card-title')[0]['style']['font-size'] = 'calc(1rem + 1vw)';
    exp_card.getElementsByClassName('card-episode')[0]['style']['font-size'] = 'calc(.5rem + 1vw)';
    exp_card.getElementsByClassName('card-title')[0]['style']['padding'] = 'calc(1vw)';

    // TRANSITION
    setTimeout(function() {
      exp_card.style.transition = after_transitions;
      exp_card.style.top = 'calc(' + target.offsetTop + 'px - ' + Math.floor(+computed_card_h / 10) + 'px)';
      exp_card.style.left = 'calc(' + target_coordinates.left + 'px - ' + Math.floor(+computed_card_w / 10) + 'px)';

      exp_card.style.width = 'calc(' + computed_card_w + 'px + ' + Math.floor(+computed_card_w / 5) + 'px)';
      exp_card.style.height = 'calc(' + computed_card_h + 'px + ' + Math.floor(+computed_card_h / 5) + 'px)';

      exp_card.getElementsByClassName('card-title')[0]['style']['transition'] = after_transitions;
      exp_card.getElementsByClassName('card-episode')[0]['style']['transition'] = after_transitions;

      exp_card.getElementsByClassName('card-title')[0]['style']['font-size'] = 'calc(1.5rem + 1vw)';
      exp_card.getElementsByClassName('card-episode')[0]['style']['font-size'] = 'calc(1rem + 1vw)';
      exp_card.getElementsByClassName('card-title')[0]['style']['line-height'] = 'calc(1rem + 1vw)';
    }, 10);

    document.onmousemove = handleMouseMove;

    function handleMouseMove(_event) {
      const exp_card_coordinates = exp_card.getBoundingClientRect();
      if (
        (_event.clientX < target_coordinates.left) && (_event.clientX < exp_card_coordinates.left) ||
        (_event.clientX > target_coordinates.left + target_coordinates.width) &&
        (_event.clientX > exp_card_coordinates.left + exp_card_coordinates.width) ||
        (_event.clientY < target_coordinates.top && (_event.clientY < exp_card_coordinates.top) ||
          (_event.clientY > target_coordinates.top + target_coordinates.height) &&
          (_event.clientY > exp_card_coordinates.top + exp_card_coordinates.height))
        ) {
        // console.log('leave >>');
      exp_card.style.display = 'none';
      document.onmousemove = null;
      this.hovering_episode = {};
    }
  }
}

openShow() {
  this.router.navigate(['/show', this.hovering_episode['dashed_title']]);
}


}

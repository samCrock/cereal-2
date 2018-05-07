import { Component, OnInit, ElementRef } from '@angular/core';
import { ScrapingService } from '../../services';
import * as moment from 'moment';
import { Observable } from 'rxjs/Rx';
import { Router } from '@angular/router'; 

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
	providers: [ScrapingService]
})
export class HomeComponent implements OnInit {

    private calendar = [];
    private hovering_episode = {};

    formatFromNowDate(date) {
        let d =  moment(date, 'DD-MM-YYYY').from(moment().startOf('day'));
        if (d === 'a day ago') { d = 'Yesterday' }
            if (d === 'a few seconds ago') { d = 'Today' }
                return d;
        }

        formatWeekDate(date) {
            return moment(date, 'DD-MM-YYYY').format('dddd');
        }

        formatMonthDate(date) {
            return moment(date, 'DD-MM-YYYY').format('D');
        }

        constructor(private scrapingService: ScrapingService, private router: Router, private elRef:ElementRef) { }

        ngOnInit() {
            console.log('Retrieve calendar..');
            this.scrapingService.retrieveCalendar()
            .subscribe(result => {
                console.log('calendar', result);
                this.calendar = result.reverse();
                this.elRef.nativeElement.querySelector('#expanded_card');
            })
        }

        enterCard(event, show) {
        // console.log('< enter');
        this.hovering_episode = show;
        let exp_card = document.getElementById('expanded_card'),
        target_coordinates = event.target.getBoundingClientRect(),
        target = event.target,
        before_transitions = 'background-image 0s, box-shadow 0s, height 0s, width 0s, left 0s, top 0s, font-size 0s, background-size 0s, ease-in-out',
        after_transitions = 'background-image 0s, box-shadow .6s, height .6s, width .6s, left .6s, top .6s, font-size .6s, background-size 0s ease-in-out';

        exp_card.style.transition = before_transitions;
        exp_card.style.display = 'block';
        // exp_card.style.boxShadow = '0 0 3rem .5rem rgba(0, 0, 0, 0.4)';

        // START
        exp_card.style.top  = 'calc(' + target.offsetTop + 'px - 2px)';
        exp_card.style.left = 'calc(' + target_coordinates.left + 'px - 2px)';

        exp_card.style.width  = 'calc(18vw + 1vw)';
        exp_card.style.height = 'calc(18vw * 1.47 + 1px)';
        exp_card.style.backgroundImage = target.style.backgroundImage;
        exp_card.style.backgroundSize = 'calc(18vw + 1vw) calc(18vw * 1.47)';
        exp_card.getElementsByClassName('card-title')[0]['style']['transition'] = before_transitions;
        exp_card.getElementsByClassName('card-episode')[0]['style']['transition'] = before_transitions;
        exp_card.getElementsByClassName('card-title')[0]['style']['font-size'] = 'calc(1rem + 1vw)';
        exp_card.getElementsByClassName('card-episode')[0]['style']['font-size'] = 'calc(.6rem + 1vw)';

        // TRANSITION
        setTimeout(function() {
            exp_card.style.transition = after_transitions;
            exp_card.style.top  = 'calc(' + target.offsetTop + 'px - 5vw)';
            exp_card.style.left = 'calc(' + target_coordinates.left + 'px - 3.5vw)';
            exp_card.style.width  = '25vw';
            exp_card.style.height = 'calc(25vw * 1.47)';
            exp_card.style.backgroundSize = 'calc(25vw + 1vw) calc(25vw * 1.47)';
            exp_card.getElementsByClassName('card-title')[0]['style']['transition'] = after_transitions;
            exp_card.getElementsByClassName('card-episode')[0]['style']['transition'] = after_transitions;
            exp_card.getElementsByClassName('card-title')[0]['style']['font-size'] = '2.5rem';
            exp_card.getElementsByClassName('card-episode')[0]['style']['font-size'] = '1.8rem';
        }, 10);

        document.onmousemove = handleMouseMove;

        function handleMouseMove(event) {
            let exp_card_coordinates = exp_card.getBoundingClientRect();
            if (
                (event.clientX < target_coordinates.left) && (event.clientX < exp_card_coordinates.left) ||
                (event.clientX > target_coordinates.left + target_coordinates.width) && (event.clientX > exp_card_coordinates.left + exp_card_coordinates.width) || 
                (event.clientY < target_coordinates.top && (event.clientY < exp_card_coordinates.top) || 
                    (event.clientY > target_coordinates.top + target_coordinates.height) && (event.clientY > exp_card_coordinates.top + exp_card_coordinates.height))
                )
            {
                // console.log('leave >>');
                exp_card.style.display = 'none';
                document.onmousemove = null;
                this.hovering_episode = {};
            }
        }
    }


    retrievePoster(poster: string) {
        return Observable.create(observer => {
            return observer.next(poster);
        })
    }

    showScrollLeft(i) {
        const el = document.getElementById('day_' + i);
        return el && el.scrollLeft !== 0;
    }

    showScrollRight(i) {
        const el = document.getElementById('day_' + i);
        return el && el.scrollLeft < el.offsetWidth + 150;
    }

    scrollLeft(i) {
        document.getElementById('day_' + i).scrollLeft += -300;
    }

    scrollRight(i) {
        document.getElementById('day_' + i).scrollLeft += 300;
    }

    openShow() {
        this.router.navigate(['/show', this.hovering_episode['dashed_title'] ]);
    }


}

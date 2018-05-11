import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/throttleTime';
import 'rxjs/add/observable/fromEvent';
import { ScrapingService } from '../../services/index';

@Component({
	selector: 'app-search',
	templateUrl: './search.component.html',
	styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

	private show_input = '';
	private searchControl = new FormControl();
	private searchCtrlSub: Subscription;
	private shows = [];

	constructor(private scrapingService: ScrapingService) {}

	ngOnInit() {
		setTimeout(function () {
			document.getElementById('search_input').focus();
		}, 10);

		this.searchCtrlSub = this.searchControl.valueChanges
		.debounceTime(500)
		.subscribe(newValue => {
			this.shows = [];
			this.show_input = newValue
			console.log(this.show_input);
			this.scrapingService.searchShows(this.show_input)
			.subscribe(result => {
				this.scrapingService.retrieveShow(result)
				.subscribe(show => {
					this.shows.push(show);
					console.log('Search shows result:', show);
				});
			});
		});
	}


}

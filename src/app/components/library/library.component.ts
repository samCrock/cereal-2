import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/index';

@Component({
	selector: 'app-library',
	templateUrl: './library.component.html',
	styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {

	private library;
	constructor(private dbService: DbService) { }

	ngOnInit() {
		this.dbService.getLibrary()
		.subscribe(library => {
			this.library = library;
			console.log('Library:', library);
		});
	}

}

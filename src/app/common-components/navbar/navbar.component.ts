import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { NavbarService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';
import { Router } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  providers: []
})
export class NavbarComponent implements OnInit {

  private current_show: Object;
  private subscription: Subscription;

  constructor(
    private navbarService: NavbarService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.navbarService.getShow()
    .subscribe(show => {
      console.log('Navbar current_show', show);
      this.current_show = show;
    });
    // this.current_show = this.navbarService.getShow();
  }

}

import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { NavbarService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';
import { Router, NavigationEnd } from '@angular/router';
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
  private enabled = true;
  private currentRoute = '';

  constructor(
    private navbarService: NavbarService,
    private router: Router
    ) {
  }

  ngOnInit() {
    this.navbarService.getShow()
    .subscribe(show => {
      this.current_show = show;
    });
    this.router.events.subscribe(val => {
      if (val instanceof NavigationEnd) {
        this.currentRoute = val['url'];
        if (val['url'] === '/play') {
          this.enabled = false;
        } else {
          this.enabled = true;
        }
      }
    });
  }

  isActive(route_name) {
    if (route_name === 'home' && this.currentRoute === '/') { return true; }
    if (route_name === 'torrents' && this.currentRoute.indexOf('/torrents') > -1) { return true; }
    if (route_name === 'show' && this.currentRoute.indexOf('/show/') > -1) { return true; }
    if (route_name === 'search' && this.currentRoute.indexOf('/search') > -1) { return true; }
    return false;
  }

}

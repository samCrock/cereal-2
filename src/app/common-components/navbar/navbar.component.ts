import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { NavbarService, DbService } from '../../services';
import * as moment from 'moment';
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

  public current_show: Object;
  public subscription: Subscription;
  public enabled = true;
  public currentRoute = '';
  public settingsOpen = false;


  constructor(
    public navbarService: NavbarService,
    public router: Router,
    public dbService: DbService
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
    if (route_name === 'library' && this.currentRoute === '/library') { return true; }
    if (route_name === 'torrents' && this.currentRoute.indexOf('/torrents') > -1) { return true; }
    if (route_name === 'show' && this.currentRoute.indexOf('/show/') > -1) { return true; }
    if (route_name === 'search' && this.currentRoute.indexOf('/search') > -1) { return true; }
    if (route_name === 'settings' && this.settingsOpen) { return true; }
    return false;
  }

  refresh() {
    window.location.reload();
  }

  chooseFolder() {
    const folder_input = document.getElementById('folder_input');
    folder_input.addEventListener('change', e => {
      e.preventDefault();
      console.log(e.target['value']);
    });
    folder_input.click();
  }


}

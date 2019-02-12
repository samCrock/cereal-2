import { Component, Input, OnInit } from '@angular/core';
import { NavbarService } from '../../services';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { ElectronService } from 'ngx-electron';

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

  @Input() updateProgress: number;

  public remote = this.electronService.remote;

  constructor(
    public navbarService: NavbarService,
    public router: Router,
    public electronService: ElectronService
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
        if (val['url'].indexOf('/play') > - 1) {
          this.enabled = false;
          // document.body.style.height = '100%';
          // document.body.style.top = '0';
        } else {
          this.enabled = true;
          // document.body.style.height = 'calc(100vh - 4rem)';
          // document.body.style.top = '4rem';
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.which === 116) {
        location.reload();
      }
    });

  }

  isActive(route_name) {
    if (route_name === 'trending' && this.currentRoute === '/') { return true; }
    if (route_name === 'calendar' && this.currentRoute === '/calendar') { return true; }
    if (route_name === 'library' && this.currentRoute === '/library') { return true; }
    if (route_name === 'torrents' && this.currentRoute.indexOf('/torrents') > -1) { return true; }
    if (route_name === 'show' && this.currentRoute.indexOf('/show/') > -1) { return true; }
    if (route_name === 'search' && this.currentRoute.indexOf('/search') > -1) { return true; }
    if (route_name === 'trending' && this.currentRoute.indexOf('/trending') > -1) { return true; }
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

  quit() {
    this.remote.getCurrentWindow().close();
  }

  minimize() {
    this.remote.getCurrentWindow().minimize();
  }

}

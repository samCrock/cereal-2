import {
  HomeComponent,
  LibraryComponent,
  ShowComponent,
  PlayerComponent,
  TorrentsComponent,
  SearchComponent,
  TrendingComponent
} from './components';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
{
    path: '',
    component: HomeComponent
},
{
    path: 'library',
    component: LibraryComponent
},
{
    path: 'show/:title',
    component: ShowComponent
},
{
    path: 'torrents',
    component: TorrentsComponent
},
{
    path: 'play',
    component: PlayerComponent
},
{
    path: 'search',
    component: SearchComponent
},
  {
    path: 'trending',
    component: TrendingComponent
  }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true, onSameUrlNavigation: 'reload' })],
    exports: [RouterModule]
})
export class AppRoutingModule { }

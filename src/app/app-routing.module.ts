import { HomeComponent, LibraryComponent, ShowComponent, PlayerComponent, TorrentsComponent, SearchComponent } from './components/index';
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
}
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule { }

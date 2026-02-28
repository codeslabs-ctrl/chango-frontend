import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { RecuperarPasswordComponent } from './features/auth/recuperar-password/recuperar-password.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'recuperar-contraseña', component: RecuperarPasswordComponent },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/dashboard-layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'estadisticas', loadComponent: () => import('./features/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent) },
      { path: 'ventas', loadComponent: () => import('./features/ventas/ventas.component').then(m => m.VentasComponent) },
      { path: 'ventas/nuevo', loadComponent: () => import('./features/ventas/venta-nueva/venta-nueva.component').then(m => m.VentaNuevaComponent) },
      { path: 'productos', loadComponent: () => import('./features/productos/productos.component').then(m => m.ProductosComponent) },
      { path: 'productos/nuevo', loadComponent: () => import('./features/productos/producto-nuevo/producto-nuevo.component').then(m => m.ProductoNuevoComponent) },
      { path: 'productos/:id/editar', loadComponent: () => import('./features/productos/producto-editar/producto-editar.component').then(m => m.ProductoEditarComponent) },
      { path: 'almacenes', loadComponent: () => import('./features/almacenes/almacenes.component').then(m => m.AlmacenesComponent) },
      { path: 'almacenes/:id', loadComponent: () => import('./features/almacenes/almacen-detail/almacen-detail.component').then(m => m.AlmacenDetailComponent) },
      { path: 'clientes', loadComponent: () => import('./features/clientes/clientes.component').then(m => m.ClientesComponent) },
      { path: 'clientes/:id/editar', loadComponent: () => import('./features/clientes/cliente-editar/cliente-editar.component').then(m => m.ClienteEditarComponent) },
      { path: 'categorias', loadComponent: () => import('./features/categorias/categorias.component').then(m => m.CategoriasComponent) },
      { path: 'categorias/nuevo', loadComponent: () => import('./features/categorias/categoria-nuevo/categoria-nuevo.component').then(m => m.CategoriaNuevoComponent) },
      { path: 'categorias/:id/editar', loadComponent: () => import('./features/categorias/categoria-editar/categoria-editar.component').then(m => m.CategoriaEditarComponent) },
      { path: 'cuenta', loadComponent: () => import('./features/cuenta/cuenta.component').then(m => m.CuentaComponent) },
      { path: 'cuenta/datos', loadComponent: () => import('./features/cuenta/cuenta-datos/cuenta-datos.component').then(m => m.CuentaDatosComponent) },
      { path: 'cuenta/password', loadComponent: () => import('./features/cuenta/cuenta-password/cuenta-password.component').then(m => m.CuentaPasswordComponent) },
      { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [adminGuard] },
      { path: 'usuarios/nuevo', loadComponent: () => import('./features/usuarios/usuario-nuevo/usuario-nuevo.component').then(m => m.UsuarioNuevoComponent), canActivate: [adminGuard] },
      { path: 'usuarios/:id/editar', loadComponent: () => import('./features/usuarios/usuario-editar/usuario-editar.component').then(m => m.UsuarioEditarComponent), canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

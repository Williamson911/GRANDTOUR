// dans votre user.service.ts ou auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  // URL par défaut de JSON Server pour la table "users"
  private jsonServerUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  getCurrentUserProfile(): Observable<any> {
    const email = localStorage.getItem('currentUserEmail');

    // JSON Server renvoie un tableau [] lors d'un filtrage par paramètre.
    // On utilise "map" pour extraire uniquement le premier élément trouvé.
    return this.http
      .get<any[]>(`${this.jsonServerUrl}?email=${email}`)
      .pipe(map((users) => (users.length > 0 ? users[0] : null)));
  }
}

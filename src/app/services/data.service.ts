import {Injectable} from '@angular/core';
import {AuthHttp} from 'angular2-jwt';
import {Observable} from 'rxjs/Observable';
import {Commentary, Waste, Friends, TypePost, User} from '../interface/interface';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

function encodeData(data) {
  return Object.keys(data).map(function (key) {
    return [key, data[key]].map(encodeURIComponent).join('=');
  }).join('&');
}

@Injectable()
export class DataService {


  constructor(private http: AuthHttp) {
  }

  /**
   * Get all Users
   * @param {Object} args -key limitData and searchData and precise value
   */
  getUsers(data): Promise<any> {
    return this.http.get('api/users/get?' + encodeData(data)).toPromise();
  }

  /**
   * Get data from a specific user and load data from the backend
   * @param {String} userid
   * @param {String} [typeOfRequest] - [requested,accepted] default accepted friend
   * @path {Post}
   * @returns {Observable<Response>}
   */
  getThisUser(userId, typeOfRequest?, fullDataWanted?): Promise<any> {
    return this.http.post('/api/users/getThisUsers', JSON.stringify({
      userId,
      typeOfRequest,
      fullDataWanted
    })).toPromise();
  }

  /**
   * Refresh data rom a user
   * @param token {String} Json web token
   * @returns {Observable<Response>}
   */
  refreshUserData(userId): Observable<any> {
    return this.http.post('/api/users/refreshUserData', JSON.stringify(userId));
  }

  /**
   * Update perso data
   * @param {Object} champ -userId and the value to change
   * @returns {Observable<Response>}
   */
  updateChamp(champ): Observable<any> {
    return this.http.post('/api/profile/updateChamp', JSON.stringify(champ));
  }

  updatePassword(pass): Observable<any> {
    return this.http.post('/api/profile/updatePassword', JSON.stringify(pass));
  }


  logOut(userId): Observable<any> {
    return this.http.post(`/api/users/logout`, JSON.stringify({userId}));
  }

  /**
   * Delete my account
   * @param {String} userId -mongooose UserId
   * @returns {Observable<Response>}
   */
  deleteAccount(userId: string): Observable<any> {
    return this.http.delete(`api/profile/deleteAccount/${userId}`);
  }

  getYourOwnPicture(userId: Object): Observable<any> {
    return this.http.get(`api/users/uploadPicture/${userId}`);
  }

  /**
   * Delete all your own Picture
   * @param userId
   * @returns {Observable<Response>}
   */
  deletePictures(userId: string, photos?: string): Promise<any> {
    return this.http.delete(`/api/users/deleteAllPicture/${userId}` + photos ? '/' + photos : '').toPromise();
  }

  /**
   * get the new socket id of the connected user
   * @param userId
   * @param socketId
   * @param token
   * @returns {Observable<Response>}
   */
  refreshSocketIdOfConnectedUsers(userId: string, socketId: string, token: string): Observable<any> {
    return this.http.post('/api/users/refreshSocketId', JSON.stringify({
      userId,
      socketId,
      token
    }));
  }

  /**
   * Send a new post
   * @param request
   * @returns {Observable<Response>}
   */
  sendWaste(request: Object) {
    return this.http.post('api/waste/sendPost', JSON.stringify(request));
  }

  dataCommentary(waste: Waste, userId: string) {
    return this.http.post('api/waste/getCommentary', JSON.stringify(waste));
  }

  /**
   * Get post from a user and all this different friends
   * @param userId {String}
   * @param numberOfWaste {Number}
   * @param typePost {String} means publicOnly or allnf
   * @param onlyOwnPost {Boolean} means that i only want my own post
   * @param skipLimit for infinite scrollig
   * @returns {Observable<Response>}
   */
  getPost(userId: string, numberOfWaste: number, typePost: TypePost, onlyOwnPost: boolean, skipLimit: number): Observable<any> {
    return this.http.post('/api/waste/getPost', JSON.stringify({
      following: userId,
      numberOfWaste,
      typePost,
      onlyOwnPost,
      skipLimit
    }));
  }

  sendWasteComments(comments) {
    return this.http.post('/api/waste/sendComments', JSON.stringify({comments}));
  }

  /**
   *
   * @param wasteId {String} post id
   * @param commentId {String}
   * @returns {Observable<Response>}
   */
  deletePost(wasteId, commentId?): Observable<any> {
    return this.http.delete('/api/waste/deletePost/' + wasteId + (commentId ? '/' + commentId : ''));
  }

  likeThisPostOrComment(userId, wasteId, commentId?): Observable<any> {
    return this.http.get('api/waste/likeThisPostOrComment/' + userId + '/' + wasteId + (commentId ? '/' + commentId : ''));
  }

  listOfFriends(followingTable: Friends[]): Promise<any> {
    return this.http.post('/api/users/getListOfFriends', JSON.stringify(followingTable)).toPromise();
  }
}

import React from 'react';
import axios from 'axios';
import { instanceOf } from 'prop-types';
import { withCookies, Cookies } from 'react-cookie';
import { FiClock, FiRefreshCw, FiSettings, FiGrid, FiList } from 'react-icons/fi';
import './App.css';

class App extends React.Component {

  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  }

  constructor(props) {
    super(props);
 
    const { cookies } = props;
    const cookieContents = cookies.get('state') || {};

    this.state = {
      githubToken: cookieContents.githubToken || '',
      username: cookieContents.username || '',
      group: cookieContents.group || '',
      userPRs: [],
      groupPRs: [],
      showUserPrs: cookieContents.showUserPrs,
      showGroupPrs: cookieContents.showGroupPrs,
      isSettingsMenuOpen: false,
      showGridView: cookieContents.showGridView || true,
      dismissedRepos: cookieContents.dismissedRepos || [],
      loading: false,
    };
  }

  componentDidMount() {
    this.selectFilterTabs();
    this.getPRs();
    if (!this.state.showUserPrs && !this.state.showGroupPrs) {
      this.selectFilterAll();
    }
  }

  getPRs() {
    if ( !this.state.githubToken) {
      this.setState({'isSettingsMenuOpen': true})
      return;
    }
    this.setState({'loading': true});
    this.setState({'userPRs': [], 'groupPRs': []});
    // PRs User has been requested to review
    axios({
      method: 'get',
      url: `https://api.github.com/search/issues?q=is%3Aopen+is%3Apr+archived%3Afalse+review-requested%3A${this.state.username}`,
      headers: {
        'Authorization': `Bearer ${this.state.githubToken}`,
        'Content-Type': "application/json"
      }})
      .then(res => {
        this.setState({'userPRs': res.data.items})
      })
      .catch(error => {
        this.setState({'loading': false});
      });

    // PRs User's group has been requested to review
    axios({
      method: 'get',
      url: `https://api.github.com/search/issues?q=is%3Aopen+is%3Apr+archived%3Afalse+team-review-requested%3AMappedIn%2F${this.state.group}`,
      headers: {
        'Authorization': `Bearer ${this.state.githubToken}`,
        'Content-Type': "application/json"
      }})
      .then(res => {
        this.setState({'groupPRs': res.data.items, 'loading': false})
      })
      .catch(error => {
        this.setState({'loading': false});
      });
  }

  toggleSettingsMenu = () => {
    this.setState({'isSettingsMenuOpen': !this.state.isSettingsMenuOpen})
  }

  toggleGridView = () => {
    this.setState({'showGridView': !this.state.showGridView}, () => this.updateCookie());
  }

  saveToCookie = () => {
    this.updateCookie();
    this.getPRs();
  }

  clearCookies = () => {
    const { cookies } = this.props; 
    cookies.remove('state');
    this.setState({githubToken: '', username: '', group: ''}, () => {this.getPRs()});
  }

  updateCookie = () => {
    const { cookies } = this.props; 
    let stateContents = JSON.stringify(this.state, ['username', 'group', 'showUserPrs', 'showGroupPrs', 'showGridView', 'dismissedRepos', 'githubToken']);
    cookies.set('state', stateContents);
  }

  handleTokenChange = (event) => {
    this.setState({githubToken: event.target.value});
  }

  handleUsernameChange = (event) => {
    this.setState({username: event.target.value});
  }

  handleGroupChange = (event) => {
    this.setState({group: event.target.value});
  }

  selectFilterAll() {
    this.setState({'showUserPrs': true, 'showGroupPrs': true}, () => { 
      this.selectFilterTabs();
      this.updateCookie();
    });
  }

  selectFilterUser() {
    this.setState({'showUserPrs': true, 'showGroupPrs': false}, () => { 
      this.selectFilterTabs();
      this.updateCookie();
    });
  }

  selectFilterGroup() {
    this.setState({'showUserPrs': false, 'showGroupPrs': true}, () => { 
      this.selectFilterTabs();
      this.updateCookie();
    });
  }

  selectFilterTabs() {
    for(let elem of document.getElementsByClassName('tabs-item')) {
      elem.classList.remove('selected')
    };
    if (this.state.showUserPrs && this.state.showGroupPrs) document.getElementById('allFilter').classList.add('selected');
    else if (this.state.showUserPrs) document.getElementById('userFilter').classList.add('selected');
    else if (this.state.showGroupPrs) document.getElementById('groupFilter').classList.add('selected');
  }
 
  dismissRepo(repoName) {
    this.setState({'dismissedRepos': this.state.dismissedRepos.concat([repoName])}, () => { this.updateCookie() });
  }

  undoDismiss(repoName) {
    var index = this.state.dismissedRepos.indexOf(repoName);
    if (index > -1) {
      let copiedArray = this.state.dismissedRepos;
      copiedArray.splice(index, 1);
      this.setState({'dismissedRepos': copiedArray}, () => { this.updateCookie()})
    }
  }

  getRepoName(url) {
    return url.split('/').pop();
  }

  getPendingPRs(repoName) {
    let PRsToShow = this.getPRsToShow();
    return PRsToShow
    .filter((pr) => {
      return this.getRepoName(pr.repository_url) === repoName;
    })
    .filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj.number).indexOf(obj.number) === pos;
    })
    .length;
  }

  getPRsToShow() {
    let allPRs = [];
    if (this.state.showGroupPrs) allPRs = allPRs.concat(this.state.groupPRs);
    if (this.state.showUserPrs) allPRs = allPRs.concat(this.state.userPRs);
    return allPRs;
  }

  prsNoDuplicates() {
    let PRsToShow = this.getPRsToShow();

    let prs = PRsToShow.filter((obj, pos, arr) => {
      let repoName = this.getRepoName(obj.repository_url);
      return !this.state.dismissedRepos.includes(repoName) &&
        arr.map(mapObj => mapObj.number).indexOf(obj.number) === pos;
    });
    
    if (prs.length > 0) document.title = `Pull Requests (${prs.length})`;
    else document.title = `Pull Requests`;

    return prs.length;
  }

  renderPRs() {
    // Determine all PRs needed to be shown
    let PRsToShow = this.getPRsToShow();

    // Group by repository
    let groupedByRepo = PRsToShow.reduce((h, obj) => Object.assign(h, { [obj.repository_url]:( h[obj.repository_url] || [] ).concat(obj) }), {})
  
    // Rendering
    let toRender = [];
    Object.entries(groupedByRepo).forEach(
      ([key, value], index) => {
        let repo = this.getRepoName(key);
        let repoLink = `https://github.com/MappedIn/${repo}`;

        if ((this.state.dismissedRepos).includes(repo)) return;

        value = value.filter((obj, pos, arr) => {
          return arr.map(mapObj => mapObj.number).indexOf(obj.number) === pos;
        });

        toRender.push(
          <div className="pr-group-wrapper" style={{flex : `${this.state.showGridView ? '1 0 200px' : '1 0 90%'}`}} key={index}>
            <div className="repo-name"> 
              <a className="repo-link" href={repoLink}>{repo}</a>
              <a onClick={() => this.dismissRepo(repo)} className="dismiss-repo"> Dismiss Repo </a>
            </div>
            { value.map((pr, index) => 
              <a className="pr-wrapper" href={repoLink + '/pull/' + pr.number} key={index}>
                <div className="pr-title">{pr.title}</div>
                <div className="pr-details">
                  <span> <FiClock /> {prettyDate(pr.created_at)}</span>
                  <span> <img className="pr-user-avatar" src={pr.user.avatar_url} /> {pr.user.login}</span>
                </div>
                { false && pr.labels.map((label, index) => <div><div className={`pr-label ${label.name}`} key={index}>{label.name}</div></div>)} 
              </a>
              ) }
          </div>
        )
      }
    );

    return toRender;
  }

  renderDismissedPRs() {
    return this.state.dismissedRepos.map((repo, index) =>
        <div className="pr-group-wrapper dismissed" style={{flex : `${this.state.showGridView ? '1 0 200px' : '1 0 90%'}`}} key={index}>
          <div className="repo-name"> 
            <a className="repo-link">{repo} ({this.getPendingPRs(repo)} Pending)</a>
            <a onClick={() => this.undoDismiss(repo)} className="dismiss-repo"> Undo Dismiss</a>
          </div>
        </div> 
      )
  }

  render() {
    return (
      <div className="App">
        <div className="header">
          <span className="topbar-title-text">PULL REQUESTS</span>
          <FiSettings size=".9em" onClick={() => this.toggleSettingsMenu()} />
          <div className="settings-wrapper" style={{'display': this.state.isSettingsMenuOpen ? 'flex' : 'none'}}>
            <label>Github Token</label>
            <input className="token-input" value={this.state.githubToken} onChange={this.handleTokenChange} type='password'/>
            <label>Github Username</label>
            <input className="username-input" value={this.state.username} placeholder="Username" onChange={this.handleUsernameChange}/>
            <label>MappedIn Group</label>
            <input className="group-input" value={this.state.group} placeholder="Group" onChange={this.handleGroupChange}/>
            <div className="settings-button-wrapper">
              <button className="primary" onClick={() => this.saveToCookie()}> Save to Cookie</button>
              <button className="secondary" onClick={() => this.clearCookies()}> Clear Cookies </button>
            </div>
          </div>
        </div>

        <div className="subnav">
          <div style={{'display':'flex'}}>
            <h1> {this.prsNoDuplicates()} Pending Pull Requests </h1>
            <FiRefreshCw onClick={() => this.getPRs()} />
          </div>
          <div className="tabs">
            <div onClick={() => this.selectFilterAll()} id="allFilter" className="tabs-item selected">All</div>
            <div onClick={() => this.selectFilterUser()} id="userFilter" className="tabs-item">User Review</div>
            <div onClick={() => this.selectFilterGroup()} id="groupFilter" className="tabs-item">Group Review</div>
            <FiGrid className={`filterIcon ${this.state.showGridView  ? " selected" : ""}`} onClick={() => this.toggleGridView()} />
            <FiList className={`filterIcon ${this.state.showGridView  ? "" : " selected"}`} onClick={() => this.toggleGridView()} />
          </div> 
        </div>

        <div className="pace" style={{'display': this.state.loading ? 'flex' : 'none'}}>
          <div className="pace-progress" />
        </div>
        <div className="all-prs-wrapper">
          { !this.state.loading && this.renderPRs() }
        </div>
        { !this.state.loading &&  this.renderDismissedPRs() }
      </div>
    )
  }
}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */
// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time){
  var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);
      
  if ( isNaN(day_diff) || day_diff < 0 )
    return;
      
  return day_diff === 0 && (
      diff < 60 && "just now" ||
      diff < 120 && "1 minute ago" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
      diff < 7200 && "1 hour ago" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours ago"
    ) ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    (day_diff < 31 && (day_diff/7 <= 1)) && Math.ceil( day_diff / 7 ) + " week ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
    new Date(date).toLocaleDateString();
}

export default withCookies(App);

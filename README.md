# MappedIn Pull Request Dashboard

## Problem
It’s very difficult to determine what PRs need my attention. 
Github emails have a lot of noise.
It’s not scalable to post PR links in the Slack channel and expect prompt reviews. That’s a lot of cognitive load - devs need to keep track of which PRs in the channel they have reviewed and which ones are new. 
Also it’s an extra step to post PRs in the channel for the dev creating the PR.

## Findings
Github does not support an `OR` operator in their search queries

You can search for… 
`is:open is:pr archived:false  review-requested:uakhundz` for PRs that request your review explicitly
or for
`is:open is:pr archived:false team-review-requested:MappedIn/consumer` for PRs that request the team review 

## Solution
Simple webpage where the user provides their GitHub token, username and group name.

Webpage makes 2 requests to Github (one for the user, one for the team they’re in) and provides a complete list of PRs in need of review from the user.

Click on an item from the list to navigate to the code review.
Store the token in a cookie and read from cookie on page load.
Refresh page to retrieve results again.
Webpage shows an indication in the tab title for pending PRs.
Webpage refreshes data in the background every 10 minutes.
PRs drop off the page when you review (accept or leave comments).
PRs show back up on the list if review is requested again.

## Usage
Set up a gitHub token with 'repo' access. Provide it to the app alongside your username and organization group name.

## Future Additions
Webpage also has an easy way to get to the user’s own posted PRs.
GitHub authentication instead of using token.
Retrieve username and group automatically.
Ability to provide more than one group.
Webpage has desktop notifications you can enable when new PRs are posted.

## Open Source
There are a lot of people asking for the `OR` operator and GitHub is ignoring their requests. It would be cool to publish this resource as an open source tool.  See: https://github.com/isaacs/github/issues/660 Idea for open source tool: Custom search field that lets you apply any number of Github search params, and ORs them all.


// i set all required vars globally
var fs = require('fs');
var keys = require('./keys');
var request = require('request');
var spotify = require('spotify');
var Twitter = require('twitter');
var inquirer = require('inquirer');

// logs results to log.txt
function logResults(results) {
  fs.appendFile('log.txt', results, function (err) {
    if (err) {
      console.log(err);
    }
  });
}

// general function to post results from each command
function postResults(obj) {
  var resultsArr = [];
  var resultsStr = '';
  var i;

  // adds command to front of arr
  resultsArr.push(obj.command);

  // loops through obj's arr, adding to resultsArr
  // also posts data to console preventing additional for loop
  for (i = 0; i < obj.text.length; i += 1) {
    console.log(obj.text[i]);
    resultsArr.push(obj.text[i]);
  }

  // converts arr to string to pass to logResults
  resultsStr = resultsArr.join(',');

  // if data from log.txt isn't empty, adds ', ' for readability in file
  // should also allow creating an arr of strings of each result group
  // by splitting w/ ', '
  fs.readFile('log.txt', 'utf8', function (error, data) {
    if (data !== '') {
      logResults(' | ' + resultsStr);
    } else {
      logResults(resultsStr);
    }
  });
}

// when post-log parameter is used, reads log.txt and writes
// formatted results to the terminal
function postLog() {
  fs.readFile('log.txt', 'utf8', function (err, data) {
    var i;
    var j;
    var groupArr;
    var arr = data.split(' | ');
    console.log('================================================================================');
    console.log('log.txt data');
    for (i = 0; i < arr.length; i += 1) {
      console.log('--------------------------------------------------------------------------------');
      groupArr = arr[i].split(',');
      for (j = 0; j < groupArr.length; j += 1) {
        console.log(groupArr[j]);
      }
    }
  });
}

// logs last 20 tweets to console
function myTweets(cmd) {
  var client = new Twitter({
    consumer_key: keys.twitterKeys.consumer_key,
    consumer_secret: keys.twitterKeys.consumer_secret,
    access_token_key: keys.twitterKeys.access_token_key,
    access_token_secret: keys.twitterKeys.access_token_secret
  });

  var params = { screen_name: 'SlothyMcSloths' };
  var length;
  var tweetArr = [];
  var tweetObj = {};

  client.get('statuses/user_timeline', params, function (error, tweets, response) {
    var i;
    if (!error) {
      // if arr.length is < 20, prevents loop from attempting to
      // post tweets that aren't there
      if (tweets.length < 20) {
        length = tweets.length;
      } else {
        length = 20;
      }

      // push tweets to an arr to populate tweetObj later
      for (i = 0; i < length; i += 1) {
        tweetArr.push(tweets[i].created_at + ': ' + tweets[i].text);
      }

      // obj to pass to postResults
      tweetObj = {
        command: cmd,
        text: tweetArr
      };
      postResults(tweetObj);
    } else {
      console.log(error);
    }
  });
}

// utilizes spotify api to get song information
function spotifyThis(cmd, val) {
  var title;
  var songData;
  var spotifyObj = {};

  // sets default value if none selected
  if (val === undefined || val === '') {
    title = '"The Sign" by Ace of Base';
  } else {
    title = val;
  }

  // searches spotify by track, selecting top result
  spotify.search({ type: 'track', query: title }, function (err, data) {
    if (err) {
      console.log('Error occurred: s' + err);
    } else {
      songData = data.tracks.items[0];

      // obj to pass to postResults
      spotifyObj = {
        command: cmd,
        text: [
          'Artist: ' + songData.artists[0].name,
          'Title: ' + songData.name,
          'Album: ' + songData.album.name,
          'Preview URL: ' + songData.preview_url
        ]
      };
      postResults(spotifyObj);
    }
  });
}

// queries omdb for movie results
function movieThis(cmd, val) {
  var title;
  var queryURL;
  var movieObj = {};

  if (val === undefined || val === '') {
    title = 'Mr. Nobody';
  } else {
    title = val;
  }

  // queryURL for easier addition of parameters
  queryURL = 'http://www.omdbapi.com/?t=' + title + '&tomatoes=true';

  request(queryURL, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      // obj to pass to postResults
      movieObj = {
        command: cmd,
        text: [
          'Title: ' + JSON.parse(body).Title,
          'Year: ' + JSON.parse(body).Year,
          'IMDB Rating: ' + JSON.parse(body).imdbRating,
          'Country : ' + JSON.parse(body).Country,
          'Language: ' + JSON.parse(body).Language,
          'Plot: ' + JSON.parse(body).Plot,
          'Actors: ' + JSON.parse(body).Actors,
          'Rotten Tomatoes: ' + JSON.parse(body).tomatoURL
        ]
      };
      postResults(movieObj);
    }
  });
}

// checks command passed in from terminal and calls appropriate function
function checkCommand(cmd, val) {
  if (cmd === 'my-tweets') {
    myTweets();
  } else if (cmd === 'spotify-this-song') {
    spotifyThis(cmd, val);
  } else if (cmd === 'movie-this') {
    movieThis(cmd, val);
  } else if (cmd === 'do-what-it-says') {
    // if 'do_what_it_says' is command, recurively calls checkCommand func
    // with values from 'random.txt'
    fs.readFile('random.txt', 'utf8', function (error, data) {
      var dataArr = data.split(',');
      checkCommand(dataArr[0], dataArr[1]);
    });
  } else if (cmd === 'post-log') {
    postLog();
  }
}

// asks user to pick a title for movie or song title
function getTitle(cmd) {
  inquirer.prompt([
    {
      type: 'input',
      message: 'Please enter the title:',
      name: 'title'
    }
  ]).then(function (result) {
    if (result.title !== '') {
      checkCommand(cmd, result.title);
    }
  });
}

// uses inquirer to prompt user for search category / title, if necessary
function getInfo() {
  inquirer.prompt([
    {
      type: 'list',
      message: 'Pick a command:',
      choices: ['my-tweets', 'spotify-this-song', 'movie-this', 'do-what-it-says'],
      name: 'command'
    }
  ]).then(function (result) {
    if (result.command === 'movie-this' || result.command === 'spotify-this-song') {
      getTitle(result.command);
    } else {
      checkCommand(result.command);
    }
  });
}

// initial function call when program launches
// checkCommand(process.argv[2], process.argv[3]);
function startProg(userInput) {
  var searchCmd = userInput[2];
  var searchArr = [];
  var searchStr = '';
  var i;

  // if LIRI Bot called without command, runs inquirer
  // otherwise runs program based on command / query
  if (searchCmd === undefined) {
    getInfo();
  } else {
    // if length is > 4, combines query into single string
    if (userInput.length > 4) {
      for (i = 3; i < userInput.length; i += 1) {
        searchArr.push(userInput[i]);
      }
      searchStr = searchArr.join(' ');
    } else {
      searchStr = userInput[3];
    }
    // calls function to check command / query
    checkCommand(searchCmd, searchStr);
  }
}

// initiates the program
startProg(process.argv);

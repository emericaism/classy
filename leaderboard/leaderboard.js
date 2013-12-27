// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Meteor.Collection("players");
Users = new Meteor.Collection("users");
Classes = new Meteor.Collection("classes");
Questions = new Meteor.Collection("questions");

if (Meteor.isClient) {
  // client code: ping heartbeat every 5 seconds
  Meteor.setInterval(function () {
    Meteor.call('keepalive', Session.get('user_id'), 
      function(error, result) {
        Session.set("user_id", result);
      }
    );
  }, 5000);

  Meteor.startup(function () {
    Session.set("id", 0);
  });

  Template.welcome.selected_class = function() {
    return Session.get("my_class");
  };

  Template.welcome.classes = function() {
    return Classes.find({});
  };

  Template.welcome.my_class = function() {
    return Classes.findOne(Session.get("my_class"));
  };

  Template.back.events({
    'click': function() {
      var confusion_level = Session.get("confusion_level");
      //Classes.update(Session.get("my_class"), {$inc: {nstudents: -1}});
      var id = Session.get("user_id");
      Users.update({_id: id}, {class: -1, confusion: 0});
      Session.set("my_class", false);
    }
  });

  Template.new_class.events({
    'click .new_class': function (event) {
      new_class_name = document.getElementById("class_name").value;
      var my_id = Classes.insert({name: new_class_name, confusion: 0, nstudents: 1});
      Users.update({_id: Session.get("user_id")}, {class: my_id, confusion: 0});
      Session.set("my_class", my_id);
      Session.set("my_class_name", new_class_name);
      Session.set("confusion_level", 0);
    }
  });

  Template.new_class.debug = function() {
    if(Users.find() != undefined) {
        return Users.find().fetch().length;
    }
    return "i dunno";
  };

  Template.confusion.events({
    'click input.dec': function (event) {
      if (Session.get("confusion_level") > -5) {
        Session.set("confusion_level", Session.get("confusion_level")-1);
        Users.update(Session.get("user_id"), {$inc: {confusion: -1}});
      }
    },
    'click input.inc': function (event) {
      if (Session.get("confusion_level") < 5) {
        Session.set("confusion_level", Session.get("confusion_level")+1);
        Users.update(Session.get("user_id"), {$inc: {confusion: 1}});
      }
    }
  });

  Template.confusion.tot_confusion = function() {
    var count = 0;
    var total = 0;
    Users.find({class: Session.get("my_class")}).forEach(function (user) {
      count++;
      total += user.confusion;
    });
    if (count > 0) {
      return total / count;
    }
    return 0;
  };

  Template.confusion.nstudents = function() {
    if(Users.find() != undefined) {
        return Users.find({class: Session.get("my_class")}).fetch().length;
    }
    return -1;
  };

  Session.setDefault("confusion_level", 0);
  Template.confusion.level = function() {
    return Session.get("confusion_level");
  };

  Template.class.events({
    'click': function () {
      Session.set("my_class", this._id);
      Session.set("my_class_name", this.name);
      Session.set("confusion_level", 0);
      Classes.update(this._id, {$inc: {nstudents: 1}});
      Users.update(Session.get("user_id"), {class: Session.get("my_class"), confusion: 0});
    }
  });

  Template.questionboard.questions = function() {
    return Questions.find({class: Session.get("my_class")}, {sort: {score: -1}});
  };

  Template.question.events({
    'click': function () {
      Questions.update(this._id, {$inc: {score: 1}});
    }
  });

  Template.question_submit.events({
    'click input.submit': function () {
      var new_question = document.getElementById("new_question").value;
      Questions.insert({class: Session.get("my_class"), content: new_question, score: 0});
    }
  });

  Template.leaderboard.players = function () {
    return Users.find({}, {sort: {_id: -1}});
  };

  Template.leaderboard.selected_name = function () {
    var player = Players.findOne(Session.get("selected_player"));
    return player && player.name;
  };

  Template.player.selected = function () {
    return false;//return Session.equals("selected_player", this._id) ? "selected" : '';
  };

  Template.leaderboard.events({
    'click input.inc': function () {
      Players.update(Session.get("selected_player"), {$inc: {score: 5}});
    }
  });

  Template.player.events({
    'click': function () {
      Session.set("selected_player", this._id);
    }
  });
}

if (Meteor.isServer) {
  // server code: heartbeat method
  Meteor.methods({
    keepalive: function (user_id) {
      if (!Users.findOne(user_id))
        user_id = Users.insert({confusion:0, class: -1});
      Users.update(user_id, {$set: {last_seen: (new Date()).getTime()}});
      return user_id;
    }
  });

  // server code: clean up dead clients after 60 seconds
  Meteor.setInterval(function () {
    var now = (new Date()).getTime();
    Users.find({last_seen: {$lt: (now - 60 * 1000)}}).forEach(function (user) {
      Users.remove(user._id);
    });
  });

  Meteor.startup(function () {
    Users.remove({});
    if (Players.find().count() === 0) {
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        Players.insert({name: names[i], score: Math.floor(Random.fraction()*10)*5});
    }
    if (Classes.find().count() === 0) {
      var names = ["6.172 - Performance Engineering",
                   "6.006 - Intro to Algorithms",
                   "6.854 - Advanced Algorithms"];
      for (var i = 0; i < names.length; i++)
        Classes.insert({name: names[i], confusion: 0, nstudents: 0});
    }
  });
}

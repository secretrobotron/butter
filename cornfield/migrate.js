var
mongoose = require( 'mongoose' ),
Schema = mongoose.Schema,

Project2 = new Schema({
  data: String,
  email: String,
  name: String,
  template: String
}),
Project2Model = mongoose.model( 'Project2', Project2 ),

Project = new Schema({
  name: String,
  data: String,
  template: String,
  customData: String
}),
ProjectModel = mongoose.model( 'Project', Project ),

User = new Schema({
  email: String,
  projects: [Project],
}),
UserModel = mongoose.model( 'User', User );

function migrateUserProjects(user, finishedCallback) {
  var projectsToMigrate = user.projects.length;

  function checkForDoneState() {
    if ( projectsToMigrate === 0 ) {
      finishedCallback();
    }
  }

  console.log("Iterating over projects for " + user.email + " (" + user.projects.length + ")" );
  user.projects.forEach( function( project ) {

    console.log( project._id );
    var newProject = new Project2Model({
      data: project.data,
      email: user.email,
      name: project.name,
      template: project.template
    });

    newProject.save( function( err ) {
      if ( err ) {
        --projectsToMigrate;
        checkForDoneState();
        console.log( err );
        return;
      }

      project.remove();
      user.save( function( err ) {
        --projectsToMigrate;
        checkForDoneState();
        if ( err ) {
          console.log( err );
          return;
        }
      });
    });
  });
}

function migrateData(finishedCallback) {
  console.log("Attempting data migration");

  var usersToMigrate;

  function checkForDoneState() {
    if ( usersToMigrate === 0 ) {
      finishedCallback();
    }
  }

  UserModel.find( {}, function( err, users ) {

    usersToMigrate = users.length;

    if ( usersToMigrate === 0 ) {
      console.log("No users to migrate");
      finishedCallback();
      return;
    }

    users.forEach( function( user ) {

      if ( user.projects.length == 0 ) {
        user.remove();
        user.save( function( err ) {
          --usersToMigrate;
          checkForDoneState();

          if ( err ) {
            console.log( err );
            return;
          }

          console.log( "Deleted old record for " + user.email );
        });
      }

      migrateUserProjects(user, function(){
        --usersToMigrate;
        checkForDoneState();
      });
    });
  });
}

// Connect to mongo, and attempt to migrate data
mongoose.connect( 'mongodb://localhost/test', function( err ) {
  if ( !err ) {
    dbOnline = true;
    migrateData(function(){
      process.exit();
    });
  }
});

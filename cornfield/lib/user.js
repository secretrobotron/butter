'use strict';

var
dbOnline = false,
mongoose = require('mongoose'),
Schema = mongoose.Schema,

Project2 = new Schema({
  data: String,
  email: String,
  name: String,
  template: String
}),
Project2Model = mongoose.model( 'Project2', Project2 );

mongoose.connect( 'mongodb://localhost/test', function( err ) {
  if ( !err ) {
    dbOnline = true;
  }
});

module.exports = {
  createProject: function( email, data, callback ) {
    if ( !email || !data ) {
      callback( 'not enough parameters to update' );
      return;
    }

    var project = new Project2Model({
      data: JSON.stringify( data.data ),
      email: email,
      name: data.name,
      template: data.template
    });

    project.save( function( err ) {
      callback( err, project );
    });
  },
  deleteProject: function( email, pid, callback ) {
    if ( !email || !pid ) {
      callback( 'not enough parameters to delete' );
      return;
    }

    Project2Model.remove( { email: email, _id: pid }, callback );
  },
  findAllProjects: function findAllProjects( email, callback ) {
    if ( !email ) {
      callback( 'not enough parameters to search' );
      return;
    }

    Project2Model.find( { email: email }, callback );
  },
  findProject: function findProject( email, pid, callback ) {
    if ( !email || !pid ) {
      callback( 'not enough parameters to search' );
      return;
    }

    Project2Model.find( { email: email, _id: pid }, function( err, doc ) {
      if ( err ) {
        callback( err );
        return;
      }

      // .find() returns an array, but this API expects a single document or null
      doc = doc.length > 0 ? doc[0] : null;
      callback( err, doc );
    });
  },
  isDBOnline: function isDBOnline() {
    return dbOnline;
  },
  updateProject: function updateProject( email, pid, data, callback ) {
    if ( !email || !pid || !data ) {
      callback( 'not enough parameters to update' );
      return;
    }

    Project2Model.find( { email: email, _id: pid }, function( err, doc ) {
      if ( err ) {
        callback( err );
        return;
      }

      if ( !doc ) {
        callback( 'project id not found' );
        return;
      }

      doc.data = JSON.stringify( data.data );
      doc.email = email;
      doc.name = data.name;
      doc.template = data.template;

      doc.save( function( err ) {
        callback( err, doc );
      });
    });
  }
};

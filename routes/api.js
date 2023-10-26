"use strict";
let mongoose = require("mongoose");
let issueSchema = new mongoose.Schema({
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_by: { type: String, required: true },
  assigned_to: String,
  open: Boolean,
  status_text: String,
  created_on: Date,
  updated_on: Date
});
let IssueModel = mongoose.model("Issue", issueSchema);

let projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  issues: [issueSchema],
});
let ProjectModel = mongoose.model("Project", projectSchema);
let ObjectId = mongoose.Types.ObjectId;

module.exports = function (app) {
  app
    .route("/api/issues/:project")
    .get(function (req, res) {
      let project = req.params.project;
    let { _id, open } = req.query;
    let queryObj=req.query;
    let queryIssuesObj={};
    for(let k of Object.keys(queryObj)){
      if(k!="_id" && k!="open"){
        let enh="issues."+k;
        queryIssuesObj[enh]=queryObj[k];
      }
    };

    ProjectModel.aggregate([
        { $match: { name: project } },
        { $unwind: "$issues" },
        _id != undefined
          ? { $match: { "issues._id": ObjectId(_id) } }
          : { $match: {} },
        open != undefined
          ? { $match: { "issues.open": open } }
          : { $match: {} },
        { $match: queryIssuesObj }
      ]).exec((err, data) => {
        if (!data) {
          res.json([]);
        } else {
          let resData = data.map((item) => item.issues);
          res.json(resData);
        }
      });
    })

    .post(function (req, res) {
      let project = req.params.project;
      let {issue_title, issue_text, created_by, assigned_to, status_text} = req.body;
      if (!issue_title || !issue_text || !created_by) {
        res.json({ error: "required field(s) missing" });
        return;
      }
      let newIssue = new IssueModel({
        issue_title: issue_title||"",
        issue_text: issue_text||"",
        created_by: created_by||"",
        assigned_to: assigned_to||"",
        status_text:status_text||"",         
        created_on: new Date(),
        updated_on: new Date(),
        open: true
      });
      ProjectModel.findOne({ name: project }, (err, projectData) => {
        if (!projectData) {
          let newProject = new ProjectModel({ name: project });
          newProject.issues.push(newIssue);
          newProject.save((err, data) => {
            if (err || !data) {
              res.send("There was an error");
            } else {
              res.json(newIssue);
            }
          });
        } else {
          projectData.issues.push(newIssue);
          projectData.save((err, data) => {
            if (err || !data) {
              res.send("There was an error");
            } else {
              res.json(newIssue);
            }
          });
        }
      });
    })

    .put(function (req, res) {
      let project = req.params.project;
      let {_id, issue_title, issue_text, created_by, assigned_to, status_text, open} = req.body;
      let obj={};
      if (issue_title) {obj["issues.$.issue_title"]=issue_title;}
      if (issue_text) {
        obj["issues.$.issue_text"]=issue_text;}
      if (created_by){obj["issues.$.created_by"]=created_by;}
      if (assigned_to){obj["issues.$.assigned_to"]=assigned_to;}
      if (status_text){obj["issues.$.status_text"]=status_text;}
  obj["issues.$.updated_on"]=new Date();
      if (open){obj["issues.$.open"]=open;}
      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }
      if (!issue_title && !issue_text && !created_by && !assigned_to && !status_text &&
!open) {
        res.json({ error: "no update field(s) sent", _id: _id });
        return;
      }

      ProjectModel.findOneAndUpdate(
        {name: project,issues:{$elemMatch:{_id:_id}}}, 
        {$set: obj},
        {upsert: true, new: true},
        (err,doc)=>{
          if (!doc || err) {
          res.send({ error: "could not update", _id: _id });
        } else {
  
  if(!doc.issues.length){
    res.send({ error: "could not update", _id: _id });
  }
           else{res.send({ result: "successfully updated", _id: _id })};
      }
  });

    })

    .delete(function (req, res) {
      let project = req.params.project;
      let { _id } =req.body;
      let idObj={_id:_id};
      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }
ProjectModel.findOneAndUpdate(
        {name: project,issues:{$elemMatch:idObj}}, 
        {$pull: {'issues': idObj}},
        {new: true},
        (err,doc)=>{
          if (!doc || err) {
          res.send({ error: "could not delete", _id: _id });
        } else {
  
  if(!doc.issues.length){
    res.send({ error: "could not delete", _id: _id });
  }
           else{res.send({ result: "successfully deleted", _id: _id })};
      }
    });
  });
};

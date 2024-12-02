import { Mongo } from 'meteor/mongo';

export const Jsons = new Mongo.Collection("jsons");
export const Ports = new Mongo.Collection("ports");
export const Lines = new Mongo.Collection("lines");


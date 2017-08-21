/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BrowserFS = require('browserfs/dist/node/index');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const path = require('path');
require('chai').should();
var expect = require('chai').expect
//require('chai').expect();
const bfs_fs = BrowserFS.BFSRequire('fs');
const NS = 'composer.food.supply';

describe('FoodSupply - Test', () => {
  var businessNetworkConnection;
    before(function() {
        BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
        var adminConnection = new AdminConnection({ fs: bfs_fs });
        return adminConnection.createProfile('defaultProfile', {
            type: 'embedded'
        })
        .then(function() {
            return adminConnection.connect('defaultProfile', 'admin', 'Xurw3yU9zI0l');
        })
        .then(function() {
            return BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));
        })
        .then(function(businessNetworkDefinition) {
            return adminConnection.deploy(businessNetworkDefinition);
        })
        .then(function() {
            businessNetworkConnection = new BusinessNetworkConnection({ fs: bfs_fs });
            return businessNetworkConnection.connect('defaultProfile', 'food-supply', 'admin', 'Xurw3yU9zI0l');
        });
    });
    describe('#FSVP', () => {
        it('Create Participants', () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
            // create supplier
            const supplier = factory.newResource(NS, 'Supplier', 'supplier@acme.org');
            supplier.countryId = 'UK';
            supplier.orgId = 'XYZ Corp';
            // create importer
            const importer = factory.newResource(NS, 'Importer', 'importer@acme.org');
            // create retailer
            const retailer = factory.newResource(NS, 'Retailer', 'retailer@acme.org');
            retailer.products=[];

            const regulator = factory.newResource(NS, 'Regulator', 'regulator@acme.org');
            regulator.location="SF";
            regulator.exemptedOrgIds=["XYZ Corp"];
            regulator.exemptedProductIds=[];

            const listing = factory.newTransaction(NS, 'createProductListing');
            listing.products = ["producta,5"];
            listing.user=factory.newRelationship(NS, 'Supplier', supplier.$identifier);
            // Get the asset registry.
            return businessNetworkConnection.getParticipantRegistry(NS + '.Supplier')
                  .then((supplierRegistry) => {
                      return supplierRegistry.add(supplier);
                  })
                  .then(() => {
                      return businessNetworkConnection.getParticipantRegistry(NS + '.Importer')
                  })
                  .then((importerRegistry) => {
                      return importerRegistry.add(importer);
                  })
                  .then(() => {
                      return businessNetworkConnection.getParticipantRegistry(NS + '.Retailer')
                  })
                  .then((retailerRegistry) => {
                      return retailerRegistry.add(retailer);
                  })
                  .then(() => {
                      return businessNetworkConnection.getParticipantRegistry(NS + '.Regulator')
                  })
                  .then((regulatorRegistry) => {
                      return regulatorRegistry.add(regulator);
                  })
                  .then(() => {
                      return businessNetworkConnection.submitTransaction(listing);
                  })
                  .then(() => {
                      return businessNetworkConnection.getAssetRegistry(NS + '.ProductListingContract')
                  })
                  .then((productListingRegistry)=>{
                        return productListingRegistry.getAll();
                  })
                  .then((productListing)=>{
                      return productListing[0].owner.$identifier.should.equal(supplier.$identifier);
                  });
            });

          it('Transfer ProductListing to Importer', () => {
              const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
              // Get the asset registry.
              var productRegistry=null;
              var listingtId=null;
              var importerId='importer@acme.org';
              return businessNetworkConnection.getAssetRegistry(NS + '.ProductListingContract')
                   .then((productListingRegistry)=>{
                       productRegistry=productListingRegistry
                       return productListingRegistry.getAll();
                   })
                   .then((productListing)=>{
                       //console.log(productListing);
                       listingtId = productListing[0].getIdentifier();
                       const listing = factory.newTransaction(NS, 'transferListing');
                       listing.ownerType= "supplier";
                       listing.newOwner=factory.newRelationship(NS, 'Importer', importerId);
                       listing.productListing=factory.newRelationship(NS, 'ProductListingContract', productListing[0].getIdentifier());
                       return businessNetworkConnection.submitTransaction(listing);
                   })
                   .then(function() {
                      return productRegistry.get(listingtId);
                   })
                   .then(function(registry) {
                        return registry.owner.$identifier.should.equal(importerId);
                   });

            });


         it('Exempt Check for ProductListing', () => {
              const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
              var productRegistry=null;
              var listingtId=null;
              var regulatorId='regulator@acme.org';
              var importerId='importer@acme.org';
              return businessNetworkConnection.getAssetRegistry(NS + '.ProductListingContract')
                   .then((productListingRegistry)=>{
                       productRegistry=productListingRegistry
                       return productListingRegistry.getAll();
                   })
                   .then((productListing)=>{
                       listingtId = productListing[0].getIdentifier();
                       const listing = factory.newTransaction(NS, 'checkProducts');
                       listing.regulator=factory.newRelationship(NS, 'Regulator', regulatorId);
                       listing.productListing=factory.newRelationship(NS, 'ProductListingContract', productListing[0].getIdentifier());
                       return businessNetworkConnection.submitTransaction(listing);
                   })
                   .then(function() {
                       return productRegistry.get(listingtId);
                   })
                   .then(function(registry) {
                         return registry.owner.$identifier.should.equal(importerId);
                   });

          });

          it('Transfer ProductListing to Retailer', () => {
              const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
              var productRegistry=null;
              var listingtId=null;
              var retailerId='retailer@acme.org';
              return businessNetworkConnection.getAssetRegistry(NS + '.ProductListingContract')
                   .then((productListingRegistry)=>{
                       productRegistry=productListingRegistry
                       return productListingRegistry.getAll();
                   })
                   .then((productListing)=>{
                       listingtId = productListing[0].getIdentifier();
                       const listing = factory.newTransaction(NS, 'transferListing');
                       listing.ownerType= "importer";
                       listing.newOwner=factory.newRelationship(NS, 'Retailer', retailerId);
                       listing.productListing=factory.newRelationship(NS, 'ProductListingContract', productListing[0].getIdentifier());
                       return businessNetworkConnection.submitTransaction(listing);
                   })
                   .then(function() {
                       return productRegistry.get(listingtId);
                   })
                   .then(function(registry) {
                         return registry.owner.$identifier.should.equal(retailerId);
                   });
          });

        });
});

# BlockchainPublicRegulationFabric-Food
A Public Regulation Fabric example in the Food Industry


## Included Components
* Hyperledger Fabric
* Hyperledger Composer

## Included technologies
* Blockchain
* Containers
* Cloud

## Application Workflow Diagram
![Application Workflow](images/GettingStartedWComposer-arch-diagram.png)

Creating multiple participants and adding ACL
* Adding additional participants
* Adding Access Control Lists
* Performing transactions

## Steps
1. [Generate the Business Network Archive (BNA)](#1-generate-the-business-network-archive-bna)
2. [Deploy the Business Network Archive using Composer Playground](#2-deploy-the-business-network-archive-using-composer-playground)
3. [Deploy the Business Network Archive on Hyperledger Composer running locally](#3-deploy-the-business-network-archive-on-hyperledger-composer-running-locally)


## 1. Generate the Business Network Archive (BNA)

To check that the structure of the files is valid, you can now generate a Business Network Archive (BNA) file for your business network definition. The BNA file is the deployable unit -- a file that can be deployed to the Composer runtime for execution.

Use the following command to generate the network archive:
```bash
npm install
```
You should see the following output:
```bash
Creating Business Network Archive

Looking for package.json of Business Network Definition
	Input directory: /Users/ishan/Documents/git-demo/BlockchainPublicRegulationFabric-Food

Found:
	Description: Sample food supplier verification network
	Name: food-supply
	Identifier: food-supply@0.0.1

Written Business Network Definition Archive file to
	Output file: ./dist/food-supply.bna

Command succeeded
```
The `composer archive create` command has created a file called `food-supply.bna` in the `dist` folder.

You can test the business network definition against the embedded runtime that stores the state of 'the blockchain' in-memory in a Node.js process.
From your project working directory, open the file test/foodTest.js and run the following command:
```
npm test
```
You should see the following output :
```
> food-supply@0.0.1 test /Users/ishan/Documents/git-demo/BlockchainPublicRegulationFabric-Food
> mocha --recursive

  FoodSupply - Test
    #FSVP
      ✓ Create Participants (185ms)
      ✓ Transfer ProductListing to Importer
      ✓ Exempt Check for ProductListing (41ms)
      ✓ Transfer ProductListing to Retailer (56ms)

  4 passing (1s)
```

## 2. Deploy the Business Network Archive using Composer Playground
Open [Composer Playground](http://composer-playground.mybluemix.net/), by default the Basic Sample Network is imported.
If you have previously used Playground, be sure to clear your browser local storage by running `localStorage.clear()` in your browser Console.

Now import the `food-supply.bna` file and click on deploy button.
<p align="center">
  <img width="100" height="50" src="images/importbtn.png">
</p>

>You can also setup [Composer Playground locally](https://hyperledger.github.io/composer/installing/using-playground-locally.html).

You will see the following:
<p align="center">
  <img width="400" height="200" src="images/ComposerPlayground.jpg">
</p>

To test your Business Network Definition, first click on the **Test** tab:

Click on the `Create New Participant` button
<p align="center">
  <img width="200" height="100" src="images/createparticipantbtn.png">
</p>


> You can also use the default `System user` to perform all the actions as we have a rule in `permissions.acl` to permit all access `System user`.

## 3. Deploy the Business Network Archive on Hyperledger Composer running locally

Please start the local Fabric using the [instructions](https://github.com/IBM/BlockchainNetwork-CompositeJourney#2-starting-hyperledger-fabric).
Now change directory to the `dist` folder containing `product-auction.bna` file and type:
```
cd dist
composer network deploy -a product-auction.bna -p hlfv1 -i PeerAdmin -s <randomString>
```

After sometime time business netwokr should be deployed to the local Hyperledger Fabric. You should see the output as follows:
```
Deploying business network from archive: food-supply.bna
Business network definition:
	Identifier: food-supply@0.0.1
	Description: Sample food supplier verification network

✔ Deploying business network definition. This may take a minute...


Command succeeded
```

You can verify that the network has been deployed by typing:
```
composer network ping -n food-supply -p hlfv1 -i admin -s adminpw
```

To create the REST API we need to launch the `composer-rest-server` and tell it how to connect to our deployed business network.
Now launch the server by changing directory to the product-auction folder and type:
```bash
cd ..
composer-rest-server
```

Answer the questions posed at startup. These allow the composer-rest-server to connect to Hyperledger Fabric and configure how the REST API is generated.
```
  _   _                                 _              _                                  ____                                                         
 | | | |  _   _   _ __     ___   _ __  | |   ___    __| |   __ _    ___   _ __           / ___|   ___    _ __ ___    _ __     ___    ___    ___   _ __
 | |_| | | | | | | '_ \   / _ \ | '__| | |  / _ \  / _` |  / _` |  / _ \ | '__|  _____  | |      / _ \  | '_ ` _ \  | '_ \   / _ \  / __|  / _ \ | '__|
 |  _  | | |_| | | |_) | |  __/ | |    | | |  __/ | (_| | | (_| | |  __/ | |    |_____| | |___  | (_) | | | | | | | | |_) | | (_) | \__ \ |  __/ | |   
 |_| |_|  \__, | | .__/   \___| |_|    |_|  \___|  \__,_|  \__, |  \___| |_|             \____|  \___/  |_| |_| |_| | .__/   \___/  |___/  \___| |_|   
          |___/  |_|                                       |___/                                                    |_|                                
? Enter your Fabric Connection Profile Name: hlfv1
? Enter your Business Network Identifier : food-supply
? Enter your Fabric username : admin
? Enter your secret: adminpw
? Specify if you want namespaces in the generated REST API: never use namespaces
? Specify if you want the generated REST API to be secured: No

To restart the REST server using the same options, issue the following command:
   composer-rest-server -p hlfv1 -n food-supply -i admin -s adminpw -N never

Discovering types from business network definition ...
Discovered types from business network definition
Generating schemas for all types in business network definition ...
Generated schemas for all types in business network definition
Adding schemas for all types to Loopback ...
Added schemas for all types to Loopback
Web server listening at: http://localhost:3000
Browse your REST API at http://localhost:3000/explorer
```
**Test REST API**
If the composer-rest-server started successfully you should see these two lines are output:
```
Web server listening at: http://localhost:3000
Browse your REST API at http://localhost:3000/explorer
```

Open a web browser and navigate to http://localhost:3000/explorer

You should see the LoopBack API Explorer, allowing you to inspect and test the generated REST API. Follow the instructions to test Business Network Definition as mentioned above in the composer section.


## Additional Resources
* [Hyperledger Fabric Docs](http://hyperledger-fabric.readthedocs.io/en/latest/)
* [Hyperledger Composer Docs](https://hyperledger.github.io/composer/introduction/introduction.html)

## License
[Apache 2.0](LICENSE)

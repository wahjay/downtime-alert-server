const axios = require('axios');
const fs = require('fs');
const { UserInputError } = require('apollo-server-express');
const CronJob = require('cron').CronJob;
const Website = require('../../models/Website');


// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const emailMsg = (url, email) => {
  const msg = {
    to: `${email}`, // Change to your recipient
    from: 'hotan38@g.ucla.edu', // Change to your verified sender
    subject: 'The website is down',
    text: `${url} is down!`,
    html: `<strong>${url} is down!</strong>`,
  }
  return msg;
};

const sendEmailAlert = async (url, email) => {
  return await sgMail
    .send(emailMsg(url, email))
    .then(() => true)
    .catch((error) => {
      console.error(error);
      return false;
    })
}

// convert url to https:// or http:// format
const convertUrl = (url) => {
  url = url.toLowerCase();
  url = url.trim();
  if (!(/^https?:\/\//i.test(url))) {
    url = 'http://' + url;
  }
  return url;
}

// send requests to destination url
const checkState = async (url) => {
  const NOT_FOUND = 404;
  return await axios.get(url)
    .then(res => {
      if(!res.status) return NOT_FOUND;
      return res.status;
    })
    .catch(err => {
      console.log(`cannot reach ${url}`, err);
      return NOT_FOUND;
    });
}

const updateWebsiteState = async (websiteId) => {
  try {
    const website = await Website.findById(websiteId);
    if(!website) {
      throw new Error('Website Not Found');
    }

    let statusCode = await checkState(website.url);
    website.latestStatus = statusCode;

    // this website is down, send alert to user
    // only if an email is provided
    if(statusCode !== 200 && website.email) {
      const success = await sendEmailAlert(website.url, website.email);
      if(success) console.log('email is successfully sent.')
      else console.log('email is failed to send.')
    }

    const status = {
      statusCode,
      timestamp: new Date()
    };

    website.history.unshift(status);
    await website.save();
    return status;
  } catch(err) {
    throw new UserInputError(err);
  }
}

const scheduleTask = (websiteId) => {
  // jobs will be ran every hour
  const job = new CronJob('0 0 */1 * * *', () => {
    updateWebsiteState(websiteId);
  });

  job.start();
  return job;
}

// in memory: websiteId -> job
let tasks = {};

// restart previous jobs if there is any
// this will be ran once each time when the server recovers
fs.readFile('./tasks.json', (err, data) => {
    if (err) throw err;
    let dataObj = JSON.parse(data);
    dataObj.webs.forEach(async webId => {
      const website = await Website.findById(webId);
      if(website) {
        const job = scheduleTask(webId);
        tasks[webId] = job;
      }
    });
});

// store the websiteId with a scheduled task into a file
// in case the server is down, task will be restarted when the server recovers
const addTask = (websiteId, url) => {
  fs.readFile('./tasks.json', (err, data) => {
      if (err) throw err;
      let dataObj = JSON.parse(data);
      dataObj.webs.push(websiteId);

      let res = JSON.stringify(dataObj);
      fs.writeFile('./tasks.json', res, (err) => {
        if (err) throw err;
      });
  });
}

// update the file
const removeTask = (websiteId) => {
  fs.readFile('./tasks.json', (err, data) => {
      if (err) throw err;
      let dataObj = JSON.parse(data);
      dataObj.webs = dataObj.webs.filter(web => web !== websiteId);

      let res = JSON.stringify(dataObj);
      fs.writeFile('./tasks.json', res, (err) => {
        if (err) throw err;
      });
  });
}


module.exports = {
  Query: {
    async getWebsites() {
      try {
        return await Website.find();
      } catch (err) {
        throw new UserInputError(err);
      }
    },

    async checkStatus(parent, { websiteId }) {
      try {
        const website = await Website.findById(websiteId);
        if(website) {
          return {
            statusCode: website.latestStatus,
            timestamp: new Date()
          }
        }
        else {
          throw new Error('Website Not Found');
        }
      } catch (err) {
        throw new Error(err);
      }
    }
  },

  Mutation: {
    async createWebsite(parent, { url, email, title }) {
      if(!url) {
          throw new UserInputError("A url must be provided.");
      }

      url = convertUrl(url);
      const website = await Website.findOne({ url });
      if(!website) {
        const statusCode = await checkState(url);
        // save to db
        const newWebsite = new Website({
          url,
          history:[{
            statusCode,
            timestamp: new Date()
          }],
          latestStatus: statusCode,
          monitered: false,
          email,
          title
        });

        const res = await newWebsite.save();
        return res;
      }
      else {
        throw new UserInputError("The website url exists already.");
      }
    },

    async deleteWebsite(parent, { websiteId }) {
      // make sure the website to be deleted exists
      const website = await Website.findById(websiteId);
      if(!website) {
        throw new Error('Website Not Found');
      }

      if(tasks[websiteId]) {
        tasks[websiteId].stop();
        delete tasks[websiteId];
        removeTask(websiteId);
      }

      await website.delete();
      return `${website.url} has been successfully deleted`;
    },

    async startMonitoring(parent, { websiteId }) {
      try {
        const website = await Website.findById(websiteId);
        if(website) {
          const job = scheduleTask(websiteId);  // schedule cron job
          tasks[websiteId] = job; // store in memory
          addTask(websiteId); // write to file

          website.monitered = true;
          await website.save();
          return {
            statusCode: website.latestStatus,
            timestamp: new Date()
          }
        }
        else {
          throw new UserInputError('Website Not Found');
        }
      } catch (err) {
        throw new UserInputError(err);
      }
    },

    async stopMonitoring(parent, { websiteId }) {
      const website = await Website.findById(websiteId);
      if(!website) {
        throw new UserInputError('Website Not Found');
      }

      if(tasks[websiteId]) {
        tasks[websiteId].stop();
        delete tasks[websiteId];
        removeTask(websiteId);
      }

      website.monitered = false;
      return await website.save();
    },

    async getReport(parent, { websiteId }) {
      try {
        const website = await Website.findById(websiteId);
        if(website) {
          return website;
        }
        else {
          throw new UserInputError('Website Not Found');
        }
      } catch (err) {
        throw new UserInputError(err);
      }
    },
  }
}

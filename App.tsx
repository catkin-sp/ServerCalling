import React, { useEffect, useState, useRef } from "react";
import { View, Text, Button, Vibration, FlatList, TouchableOpacity, StyleSheet, TextInput, LogBox, BackHandler, Alert, AppRegistry } from "react-native";
import axios from "axios";
import { MD5 } from "crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import BackgroundTimer from 'react-native-background-timer';
import Sound from 'react-native-sound';
import messaging from '@react-native-firebase/messaging';
import myHeadlessTask from './MyHeadlessTask';


import BackgroundService from 'react-native-background-actions';

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

// You can do anything in your task such as network requests, timers and so on,
// as long as it doesn't touch UI. Once your task completes (i.e. the promise is resolved),
// React Native will go into "paused" mode (unless there are other tasks running,
// or there is a foreground app).
const veryIntensiveTask = async (taskDataArguments) => {
    // Example of an infinite loop task
    const { delay } = taskDataArguments;
    await new Promise( async (resolve) => {
        for (let i = 0; BackgroundService.isRunning(); i++) {
            console.log(i);
            await sleep(delay);
        }
    });
};

const options = {
    taskName: 'Example',
    taskTitle: 'ExampleTask title',
    taskDesc: 'ExampleTask description',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane', // See Deep Linking for more info
    parameters: {
        delay: 1000,
    },
};




AppRegistry.registerHeadlessTask('MyHeadlessTask', () => myHeadlessTask);

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

interface Item {
  ID: number;
  Created: string;
  Location: string;
  ActionType: number;
}

interface Settings {
  apiKey: string | null;
  serverName: string | null;
}

const url = ' https://wp-api.qrserveme.com/action/';

messaging()
  .getToken()
  .then((token) => {
    // Log and toast
    console.log('FCM Registration Token:', token);
    alert(`FCM Registration Token: ${token}`);
  })
  .catch((error) => {
    console.log('Fetching FCM registration token failed', error);
  });


// Custom component for the Settings page
function SettingsPage({ apiKey, server, onSaveSettings }: { apiKey: string | null, server: string | null, onSaveSettings: (newApiKey: string, newServerName: string) => void }) {
  const [registrationApiKey, setApiKey] = useState<string | null>(apiKey);
  const [serverName, setServerName] = useState<string | null>(server);

  const handleSave = () => {
    onSaveSettings(registrationApiKey!, serverName!);
  };

  const handleTestSound = () => {
    
    const sound1 = new Sound('ring.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Error loading sound:', error);
        Alert.alert('Error', error.message);
        return;
      }
      
      // Play the sound
      sound1.play((success) => {

        if (success) {
          console.log('Sound played successfully');
          
        } else {
          console.log('Sound playback failed');
          // Release the sound resource
          Alert.alert('Failed', 'Sound playback failed!');
        }
      });

      setTimeout(() => {
        if (sound1.isPlaying()) {
          sound1.stop();
          Alert.alert('Sound test complete.');
        }

        sound1.release();

      }, 1000);
    });
  };

  const checkVibration = () => {
    // Check if vibration is supported on the current device
    if (!Vibration.vibrate) {
      Alert.alert('Vibration is not supported on this device.');
      return;
    }
        testVibration();
  }
  

  const testVibration = () => {
    // Vibrate the device for a short duration
    Vibration.vibrate(1000);
  
    // Schedule a notification to alert when the vibration finishes
    setTimeout(() => {
      Alert.alert('Vibration test complete.');
    }, 1000);
  };

  const handleTestVibration = () => {
    checkVibration();
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>ApiKey:</Text>
        <TextInput
          style={styles.input}
          value={registrationApiKey}
          onChangeText={setApiKey}
          placeholder="Enter ApiKey"
        />
      </View>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Server Name:</Text>
        <TextInput
          style={styles.input}
          value={serverName}
          onChangeText={setServerName}
          placeholder="Enter Server Name"
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Test Sound" onPress={handleTestSound} />
        <Button title="Test Vibration" onPress={handleTestVibration} />
      </View>
      <View style={{ marginTop: 10 }}>
          <Button title="Save" onPress={handleSave} />
        </View>
    </View>
  );
}

const getSettingsFromAsyncStorage = async (): Promise<Settings> => {
  try {
    const apiKey = await AsyncStorage.getItem('apiKey');
    const serverName = await AsyncStorage.getItem('serverName');

    return { apiKey, serverName };
  } catch (error) {
    console.log("Error retrieving settings from AsyncStorage:", error);
    return { apiKey: null, serverName: null };
  }
};

export default function App() {
  const [data, setData] = useState([]);
  const previousHashRef = useRef<string>("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [serverName, setServerName] = useState<string>("");
  const [soundObject, setSoundObject] = useState<Sound | null>(null);

  const fetchData = async () => {
   
    try {
      const headers = {
        "Content-Type": "application/json"
      };

      const fullUrl = `${url}${apiKey}?lastHash=${previousHashRef.current}${serverName ? `&server=${serverName}` : ''}`;

      const timestamp = new Date().toLocaleTimeString();
      console.log(`${timestamp}: Requesting data from URL ${fullUrl}`);

      const response = await axios.get<Item[]>(fullUrl, headers);

      console.log(`${timestamp}: Response:`, response.data);

      const ids = response.data.map(item => item.ID);
      const concatenatedIds = ids.join("");
      const hash = MD5(concatenatedIds).toString().substring(0, 8).toLowerCase();

      console.log("Hash: ", hash);

      // Compare with previous hash and play sound if different
      if (hash !== previousHashRef.current) {
         {
          console.log(`${timestamp}: Setting data`);

          setData(response.data);
          
          if (previousHashRef.current !== "")
          {
            playSoundAndVibrate();
          }
        }

        previousHashRef.current = hash;
      }

    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a non-2xx status code
        console.log("Server responded with an error:", error.response.data);
        console.log("Status code:", error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.log("No response received from the server");
        console.log("Request:", error.request);
      } else {
        // Something happened in setting up the request that triggered an error
        console.log("Error:", error.message);
      }
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const { apiKey, serverName } = await getSettingsFromAsyncStorage();
      setApiKey(apiKey!);
      setServerName(serverName!);
    };

    initializeApp();

    BackgroundService.start(veryIntensiveTask, options);
  
    return () => {
      // Cleanup code if needed
    };
  }, []);

  useEffect(() => {
    fetchData();

    const intervalId = BackgroundTimer.setInterval(() => {
      fetchData();
    }, 3000);

    return () => {
      BackgroundTimer.clearInterval(intervalId);
    };
  }, [apiKey, serverName]);

  const playSoundAndVibrate = async () => {
    try {

    // Check if sound is already playing
    if (soundObject && soundObject.isPlaying()) {
      console.log('Sound is already playing');
      return;
    }

    // Play sound
    const sound = new Sound('ring.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Error loading sound:', error);
        return;
      }
      // Play the sound
      sound.play((success) => {
        if (success) {
          console.log('Sound played successfully');
        } else {
          console.log('Sound playback failed');
        }
        // Release the sound resource
        sound.release();
      });
    });

      // Set sound object
      setSoundObject(sound);

   // Stop sound after 10 seconds
   setTimeout(() => {
    if (sound.isPlaying()) {
      sound.stop();
    }
  }, 10000);

      // Vibrate phone
      Vibration.vibrate(5000);

    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const handleListItemClick = async (id: number) => {
    try {
      // Stop playing sound
      if (soundObject) {
        soundObject.stop();
      }

      Vibration.cancel();

      await axios.put(`${url}${apiKey}?actionId=${id}`);
      console.log("Post request successful!");
      previousHashRef.current = "";

      // Refresh data after submitting the action
      fetchData();
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const onSaveSettings = async (newApiKey: string, newServerName: string) => {
    setApiKey(newApiKey);
    setServerName(newServerName);

    if (newApiKey ) {
      await AsyncStorage.setItem('apiKey', newApiKey );
    } else {
      await AsyncStorage.removeItem('apiKey');
    }
  
    if (newServerName) {
      await AsyncStorage.setItem('serverName', newServerName);
    } else {
      await AsyncStorage.removeItem('serverName');
    }

    setSettingsVisible(false);
  };

  const renderItem = ({ item }: { item: Item }) => {
    const waitTime = getWaitTime(item.Created);
    let style = { backgroundColor: "green" };

    if (waitTime >= 10) {
      style = { backgroundColor: "red" };
    } else if (waitTime >= 5) {
      style = { backgroundColor: "yellow" };
    }

    return (
      <TouchableOpacity style={styles.itemContainer} key={item.ID.toString()}>
        <Text style={style}>{waitTime} min</Text>
        <Text style={[styles.boldText]}>{formatTime(item.Created)}</Text>
        <Text style={[styles.boldText]}>{item.Location}</Text>
        <Text style={[styles.boldText]}>{getActionTypeText(item.ActionType)}</Text>
        <Button title="Accept" onPress={() => handleListItemClick(item.ID)} />
      </TouchableOpacity>
    );
  };

  const formatTime = (time: string) => {
    const formattedTime = moment(time).format("hh:mm");
    return formattedTime;
  };

  const getActionTypeText = (actionType: number) => {
    switch (actionType) {
      case 0:
        return "Menu";
      case 1:
        return "Bill";
      case 2:
        return "Waitress";
      default:
        return "Unknown";
    }
  };

  const getWaitTime = (time: string) => {
    const currentTime = moment.utc();
    const createdTime = moment.utc(time);
    const timeDifference = Math.floor((currentTime - createdTime) / 1000 / 60);
    return timeDifference;
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Server Notification v1.7</Text>
      {!settingsVisible && (
        <>
          {data.length === 0 ? (
            <Text style={styles.noActionsText}>No actions in the queue</Text>
          ) : (
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item.ID.toString()}
            />
          )}
        </>
      )}
      {settingsVisible && (
        <SettingsPage
          apiKey={apiKey}
          server={serverName}
          onSaveSettings={onSaveSettings}
        />
      )}
      {!settingsVisible && <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>
          <Button
            title="Settings"
            onPress={() => setSettingsVisible(true)}
            color="#2196F3"
          />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title="Exit"
            onPress={handleExit}
            color="#FF0000"
          />
        </View>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  buttonWrapper: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: '1%',
  },
    container: {
    flex: 1,
    padding: 16,
    backgroundColor: "black",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "white"
  },
  itemContainer: {
    marginBottom: 20,
    width: 200,
    backgroundColor: "gray"
  },
  boldText: {
    fontWeight: "bold",
  },
  noActionsText:
  {
    color: "white"
  },
  pageContainer: {
    flex: 1,
    justifyContent: "center",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    padding: 8,
    borderRadius: 4,
    color: "white"
  },
});

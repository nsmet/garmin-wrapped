import './src/polyfills';
import React, {useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import Viewer from './Viewer';
// @ts-ignore The import coordinator retains the web app's data and coverage logic.
import {collectRecap} from './src/importer.mjs';

export default function App() {
  const [key,setKey]=useState('');
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [plan,setPlan]=useState<any>(null);
  const [viewing,setViewing]=useState(false);
  const abort=useRef<AbortController|null>(null);
  async function connect(){
    if(!key.trim()){Alert.alert('Garmin key required','Enter your Garmin Personal API key.');return;}
    if(!consent){Alert.alert('Consent required','Please consent to fetching your Garmin activity and health data.');return;}
    const controller=new AbortController(); abort.current=controller;setBusy(true);setStatus('Connecting securely to Garmin…');
    const timeout=setTimeout(()=>controller.abort(),300000);
    try{
      const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
      const result=await (collectRecap as any)({key:key.trim(),year:new Date().getFullYear(),timeZone,signal:controller.signal,onProgress:setStatus});
      if(!result.chapters?.some((chapter:any)=>chapter.stories?.length))throw Error('No supported activities were recorded for this year.');
      setKey('');setPlan(result);setViewing(true);
    }catch(error:any){if(error?.name!=='AbortError')Alert.alert('Could not build your recap',error?.message||'Please try again.');}
    finally{clearTimeout(timeout);abort.current=null;setBusy(false);setStatus('');}
  }
  function clear(){abort.current?.abort();setPlan(null);setViewing(false);setKey('');setConsent(false);}
  if(viewing)return <SafeAreaView style={styles.screen}><StatusBar barStyle="light-content"/><View style={styles.header}><Pressable onPress={clear}><Text style={styles.link}>← Disconnect</Text></Pressable></View><View style={styles.viewer}><Viewer plan={plan}/></View></SafeAreaView>;
  return <SafeAreaView style={styles.screen}><StatusBar barStyle="light-content"/><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.brand}>MINI WATT ⚡</Text><Text style={styles.title}>Your year in motion.</Text><Text style={styles.copy}>Turn your Garmin activity into a personal recap.</Text><Text style={styles.label}>GARMIN PERSONAL API KEY</Text><TextInput style={styles.input} value={key} onChangeText={setKey} placeholder="Paste your personal API key" placeholderTextColor="#8490aa" secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy}/><Pressable style={styles.consent} accessibilityRole="checkbox" accessibilityState={{checked:consent}} onPress={()=>setConsent(!consent)}><Text style={styles.check}>{consent?'☑':'☐'}</Text><Text style={styles.copy}>I consent to fetching my Garmin activity and health data to build this recap.</Text></Pressable><Text style={styles.small}>Your key and recap stay in memory for this session. A connection to Garmin is required.</Text><Pressable disabled={busy} onPress={connect} style={styles.button}><Text style={styles.buttonText}>{busy?'Building your recap…':'Build my recap'}</Text></Pressable>{busy&&<><ActivityIndicator color="#fff"/><Text style={styles.copy}>{status}</Text><Pressable onPress={()=>abort.current?.abort()}><Text style={styles.link}>Cancel</Text></Pressable></>}<Pressable disabled={busy} onPress={()=>{setPlan(null);setViewing(true);}}><Text style={styles.link}>Explore a fictional example →</Text></Pressable></ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#0B1222'},header:{paddingHorizontal:18,paddingVertical:8},viewer:{flex:1},content:{padding:24,flexGrow:1,justifyContent:'center',gap:20},brand:{color:'#ffb35c',fontWeight:'800',letterSpacing:2},title:{color:'white',fontSize:42,fontWeight:'800'},copy:{color:'#d0d9ed',fontSize:15,flexShrink:1,lineHeight:22},label:{color:'#a7b6d0',fontSize:12,fontWeight:'700',letterSpacing:1},input:{backgroundColor:'#17243d',color:'white',padding:16,borderRadius:10},consent:{flexDirection:'row',gap:12,alignItems:'flex-start'},check:{color:'white',fontSize:22},small:{color:'#a7b6d0',fontSize:12,lineHeight:18},button:{backgroundColor:'#ffb35c',padding:17,borderRadius:10,alignItems:'center'},buttonText:{color:'#0B1222',fontWeight:'800'},link:{color:'#ffb35c',fontWeight:'700',paddingVertical:8}});

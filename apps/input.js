'use strict';

const reminder = require('./reminder');


function remind(){
    
        reminder.remAdd();
        
}
    
    
    
setInterval(remind,1  * 1000);